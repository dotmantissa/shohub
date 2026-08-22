import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowUpRight, Check, FileUp, ImagePlus, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useShelbyStorage } from "@/hooks/useShelby";
import { MAX_COVER_BYTES, MAX_MEDIA_BYTES, REGISTRY_ADDRESS, isConfigured } from "@/lib/config";
import { safeBlobName } from "@/lib/blob-names";
import {
  initializeRegistryPayload,
  registerProjectPayload,
  registryStatusPayload,
} from "@/lib/registry";
import { saveProject } from "@/lib/server";
import { shelbyBlobUrl } from "@/lib/shelby";
import { CATEGORIES, type Category } from "@/lib/queries";
import { projectSlug } from "@/lib/slug";
import { SiteHeader } from "@/components/SiteHeader";
import { ShelbyBadge } from "@/components/ShelbyBadge";
import { isValidXHandle, normalizeXHandle } from "@/lib/x-handle";

const COVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MB = 1024 * 1024;

const formatMB = (bytes: number) => `${Math.round(bytes / MB)} MB`;

const isHttpUrl = (value: string) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Share a project | Shohub" },
      {
        name: "description",
        content:
          "Put your Shelby project in front of people who are looking for the next good thing.",
      },
    ],
  }),
  component: Submit,
});

function Submit() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { authenticated, getAccessToken, login } = usePrivy();
  const storage = useShelbyStorage();
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [builder, setBuilder] = useState("");
  const [xHandle, setXHandle] = useState("");
  const [builderRole, setBuilderRole] = useState("");
  const [teamSize, setTeamSize] = useState("1");
  const [location, setLocation] = useState("");
  const [builderBio, setBuilderBio] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("AI");
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [socialUrl, setSocialUrl] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [media, setMedia] = useState<File | null>(null);
  const [coverUploaded, setCoverUploaded] = useState(false);
  const [mediaUploaded, setMediaUploaded] = useState(false);

  const chooseCover = (file: File | null, input: HTMLInputElement) => {
    if (!file) return;
    if (!COVER_TYPES.includes(file.type)) {
      toast.error("Use a JPG, PNG, WEBP, or GIF for the cover.");
      input.value = "";
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      toast.error(`The cover needs to be smaller than ${formatMB(MAX_COVER_BYTES)}.`);
      input.value = "";
      return;
    }
    setCover(file);
    setCoverUploaded(false);
  };

  const chooseMedia = (file: File | null, input: HTMLInputElement) => {
    if (!file) return;
    if (!file.type.startsWith("video/") && file.type !== "application/pdf") {
      toast.error("The extra file needs to be a video or a PDF.");
      input.value = "";
      return;
    }
    if (file.size > MAX_MEDIA_BYTES) {
      toast.error(`The extra file needs to be smaller than ${formatMB(MAX_MEDIA_BYTES)}.`);
      input.value = "";
      return;
    }
    setMedia(file);
    setMediaUploaded(false);
  };

  const validate = () => {
    if (!name.trim() || name.trim().length > 96) {
      toast.error("Give the project a name of up to 96 characters.");
      return false;
    }
    if (!builder.trim() || builder.trim().length > 80) {
      toast.error("Tell us who is building it, using up to 80 characters.");
      return false;
    }
    if (!isValidXHandle(xHandle)) {
      toast.error("Add a valid X handle, such as @yourname.");
      return false;
    }
    if (!builderRole.trim() || builderRole.trim().length > 80) {
      toast.error("Tell us what the builder or team does.");
      return false;
    }
    const parsedTeamSize = Number(teamSize);
    if (!Number.isInteger(parsedTeamSize) || parsedTeamSize < 1 || parsedTeamSize > 10000) {
      toast.error("Add a team size between 1 and 10,000.");
      return false;
    }
    if (!location.trim() || location.trim().length > 80) {
      toast.error("Tell us where the builder or team is based.");
      return false;
    }
    if (!builderBio.trim() || builderBio.trim().length > 280) {
      toast.error("Give the builder or team a short introduction.");
      return false;
    }
    if (!description.trim() || description.trim().length > 280) {
      toast.error("Keep the project description between 1 and 280 characters.");
      return false;
    }
    if (
      !isHttpUrl(githubUrl.trim()) ||
      !isHttpUrl(demoUrl.trim()) ||
      !isHttpUrl(websiteUrl.trim()) ||
      !isHttpUrl(socialUrl.trim())
    ) {
      toast.error("Links need to start with http or https.");
      return false;
    }
    if (!cover) {
      toast.error("Every project needs a cover image.");
      return false;
    }
    if (!isConfigured() || !REGISTRY_ADDRESS) {
      toast.error("The Shelby registry address is not configured yet.");
      return false;
    }
    if (!authenticated) {
      login();
      toast.message("Sign in with email first. Your wallet stays behind the curtain.");
      return false;
    }
    if (!storage.isReady || !storage.storageAccountAddress) {
      toast.message("Your Shelby account is still getting ready. Try again in a moment.");
      return false;
    }
    return true;
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validate() || !cover || !storage.storageAccountAddress) return;

    setSubmitting(true);
    const projectId = crypto.randomUUID();
    const coverBlobName = safeBlobName(projectId, "cover", cover.name);
    const mediaBlobName = media ? safeBlobName(projectId, "media", media.name) : null;
    const metadataBlobName = safeBlobName(projectId, "metadata", "metadata.json");
    const mediaKind = media ? (media.type.startsWith("video/") ? "video" : "pdf") : null;
    const normalizedXHandle = normalizeXHandle(xHandle);

    try {
      await storage.upload(cover, coverBlobName);
      setCoverUploaded(true);

      if (media && mediaBlobName) {
        await storage.upload(media, mediaBlobName);
        setMediaUploaded(true);
      }

      const metadata = {
        projectId,
        name: name.trim(),
        builderName: builder.trim(),
        xHandle: normalizedXHandle,
        builderRole: builderRole.trim(),
        teamSize: Number(teamSize),
        location: location.trim(),
        builderBio: builderBio.trim(),
        description: description.trim(),
        category,
        githubUrl: githubUrl.trim() || null,
        demoUrl: demoUrl.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        socialUrl: socialUrl.trim() || null,
        coverBlobName,
        mediaBlobName,
        mediaKind,
        ownerWalletAddress: storage.storageAccountAddress,
      };
      await storage.upload(
        new File([JSON.stringify(metadata)], "metadata.json", { type: "application/json" }),
        metadataBlobName,
      );

      const status = await storage.client.aptos.view({
        payload: registryStatusPayload(REGISTRY_ADDRESS, storage.storageAccountAddress),
      });
      if (!status[0]) {
        await storage.signAndSubmitTransaction({
          data: initializeRegistryPayload(REGISTRY_ADDRESS),
        });
      }

      const metadataUri = shelbyBlobUrl(storage.storageAccountAddress, metadataBlobName);
      const receipt = await storage.signAndSubmitTransaction({
        data: registerProjectPayload({
          address: REGISTRY_ADDRESS,
          projectId,
          name: name.trim(),
          category,
          metadataUri,
          createdAt: Math.floor(Date.now() / 1000),
        }),
      });
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("Your email session expired. Sign in again and retry.");

      const saved = await saveProject({
        data: {
          accessToken,
          onchainId: projectId,
          ownerWalletAddress: storage.storageAccountAddress,
          name: name.trim(),
          builderName: builder.trim(),
          xHandle: normalizedXHandle,
          builderRole: builderRole.trim(),
          teamSize: Number(teamSize),
          location: location.trim(),
          builderBio: builderBio.trim(),
          description: description.trim(),
          category,
          githubUrl: githubUrl.trim() || null,
          demoUrl: demoUrl.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          socialUrl: socialUrl.trim() || null,
          coverBlobName,
          mediaBlobName,
          mediaKind,
          metadataBlobName,
          txHash: receipt.hash,
        },
      });

      toast.success("Your project is live. The internet may now have opinions.");
      await queryClient.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/project/$id", params: { id: projectSlug(saved) } });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Shohub could not publish the project.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl gap-10 px-4 pb-24 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="self-start lg:sticky lg:top-28">
          <p className="eyebrow">Put it on the shelf</p>
          <h1 className="mt-4 max-w-lg text-4xl font-semibold tracking-tight sm:text-5xl">
            Your project deserves a proper introduction.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            Share the thing you have been building, hiding, and occasionally explaining with your
            hands. Shohub keeps the files on Shelby and the details searchable.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-muted-foreground">
            <ShelbyBadge />
            <span>Media goes straight to Shelby storage.</span>
          </div>
        </section>

        <form onSubmit={submit} className="form-panel">
          {!authenticated && (
            <div className="notice notice--soft">
              <span>
                Publishing is for email members. The wallet work happens quietly in the background.
              </span>
              <button type="button" className="text-link" onClick={login}>
                Sign in
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="form-grid">
            <Field label="Project name" required>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={96}
                required
              />
            </Field>
            <Field label="Builder or team name" required>
              <input
                value={builder}
                onChange={(event) => setBuilder(event.target.value)}
                maxLength={80}
                required
              />
            </Field>
            <Field label="X handle" hint="@yourname or x.com/yourname" required>
              <input
                value={xHandle}
                onChange={(event) => setXHandle(event.target.value)}
                maxLength={100}
                placeholder="@yourname"
                required
              />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Builder role" hint="Founder, studio, research team" required>
              <input
                value={builderRole}
                onChange={(event) => setBuilderRole(event.target.value)}
                maxLength={80}
                required
              />
            </Field>
            <Field label="Team size" hint="People working on it" required>
              <input
                type="number"
                min={1}
                max={10000}
                value={teamSize}
                onChange={(event) => setTeamSize(event.target.value)}
                required
              />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Based in" required>
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                maxLength={80}
                placeholder="City, country, or remote"
                required
              />
            </Field>
            <Field label="Builder introduction" hint={`${builderBio.length}/280`} required>
              <input
                value={builderBio}
                onChange={(event) => setBuilderBio(event.target.value)}
                maxLength={280}
                required
              />
            </Field>
          </div>

          <Field label="What are you building?" hint={`${description.length}/280`} required>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={280}
              rows={4}
              required
            />
          </Field>

          <Field label="Category" required>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
              required
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>

          <div className="form-grid">
            <Field label="GitHub link">
              <input
                type="url"
                value={githubUrl}
                onChange={(event) => setGithubUrl(event.target.value)}
              />
            </Field>
            <Field label="Live demo link">
              <input
                type="url"
                value={demoUrl}
                onChange={(event) => setDemoUrl(event.target.value)}
              />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Website">
              <input
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://"
              />
            </Field>
            <Field label="Social link">
              <input
                type="url"
                value={socialUrl}
                onChange={(event) => setSocialUrl(event.target.value)}
                placeholder="https://"
              />
            </Field>
          </div>

          <div className="form-grid">
            <UploadField
              label="Cover image"
              hint={`Up to ${formatMB(MAX_COVER_BYTES)}`}
              icon={<ImagePlus className="h-5 w-5" />}
              file={cover}
              uploaded={coverUploaded}
              accept="image/jpeg,image/png,image/webp,image/gif"
              required
              onChange={(event) => chooseCover(event.target.files?.[0] ?? null, event.target)}
            />
            <UploadField
              label="Video or PDF"
              hint={`Optional, up to ${formatMB(MAX_MEDIA_BYTES)}`}
              icon={<FileUp className="h-5 w-5" />}
              file={media}
              uploaded={mediaUploaded}
              accept="video/*,application/pdf"
              onChange={(event) => chooseMedia(event.target.files?.[0] ?? null, event.target)}
            />
          </div>

          <button
            type="submit"
            className="button button--primary button--wide"
            disabled={submitting}
          >
            {submitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {submitting ? "Publishing" : "Publish project"}
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
        {required && <small>Required</small>}
        {hint && <small>{hint}</small>}
      </span>
      {children}
    </label>
  );
}

function UploadField({
  label,
  hint,
  icon,
  file,
  uploaded,
  accept,
  required = false,
  onChange,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  file: File | null;
  uploaded: boolean;
  accept: string;
  required?: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="upload-field">
      <span className="upload-field__icon">{icon}</span>
      <span className="upload-field__copy">
        <strong>{label}</strong>
        <small>{uploaded ? "Stored on Shelby" : file ? file.name : hint}</small>
      </span>
      {uploaded && <Check className="h-4 w-4 text-primary" />}
      <input type="file" accept={accept} required={required} onChange={onChange} />
    </label>
  );
}
