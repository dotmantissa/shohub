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
import { provisionShelbyAccount, saveProject } from "@/lib/server";
import { shelbyBlobUrl } from "@/lib/shelby";
import { CATEGORIES, type Category } from "@/lib/queries";
import { projectSlug } from "@/lib/slug";
import { SiteHeader } from "@/components/SiteHeader";
import { ShelbyBadge } from "@/components/ShelbyBadge";
import { normalizeXHandle } from "@/lib/x-handle";
import { submissionValidationError } from "@/lib/submission-validation";

const COVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MB = 1024 * 1024;

const formatMB = (bytes: number) => `${Math.round(bytes / MB)} MB`;

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
    const error = submissionValidationError({
      name,
      builder,
      xHandle,
      builderRole,
      teamSize,
      location,
      builderBio,
      description,
      githubUrl,
      demoUrl,
      websiteUrl,
      socialUrl,
    });
    if (error) {
      toast.error(error);
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
      const fundingAccessToken = await getAccessToken();
      if (!fundingAccessToken) {
        throw new Error("Your email session expired. Sign in again and retry.");
      }
      await provisionShelbyAccount({
        data: {
          accessToken: fundingAccessToken,
          storageAccountAddress: storage.storageAccountAddress,
          domain: window.location.host,
        },
      });

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
    <div className="app-page min-h-screen">
      <SiteHeader />
      <main className="page-shell grid gap-8 pb-20 pt-9 sm:gap-10 sm:pb-24 sm:pt-14 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="self-start lg:sticky lg:top-28">
          <p className="eyebrow">Put it on the shelf</p>
          <h1 className="page-title mt-4 max-w-lg font-semibold">
            Your project deserves a proper introduction.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
            Share the thing you have been building, hiding, and occasionally explaining with your
            hands. Shohub keeps the files on Shelby and the details searchable.
          </p>
          <div className="submit-storage-note mt-8 flex items-center gap-3 text-sm text-muted-foreground">
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

          <p className="form-required-note">
            Fields marked with <strong>*</strong> are needed to put your project on the shelf.
          </p>

          <FormSection
            title="Project"
            description="Give people the quick version they need before they click in."
          >
            <div className="form-grid">
              <Field label="Project name" required>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={96}
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
            </div>
            <Field
              label="Project description"
              hint="What are you making, and why should someone care?"
              count={`${description.length}/280`}
              required
            >
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={280}
                rows={4}
                required
              />
            </Field>
          </FormSection>

          <FormSection
            title="Builder"
            description="A little context about the people behind the project makes the shelf more useful."
          >
            <div className="form-grid">
              <Field label="Builder name" required>
                <input
                  value={builder}
                  onChange={(event) => setBuilder(event.target.value)}
                  maxLength={80}
                  required
                />
              </Field>
              <Field
                label="X handle"
                hint="Use your public handle so we can show your profile photo."
                required
              >
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
              <Field label="Builder role" hint="Founder, studio, or research team" required>
                <input
                  value={builderRole}
                  onChange={(event) => setBuilderRole(event.target.value)}
                  maxLength={80}
                  required
                />
              </Field>
              <Field label="Team size" hint="Count the people actively working on it" required>
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
              <Field label="Based in" hint="City, country, or remote" required>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  maxLength={80}
                  required
                />
              </Field>
              <Field
                label="Builder introduction"
                hint="The short version of who you are"
                count={`${builderBio.length}/280`}
                required
              >
                <textarea
                  value={builderBio}
                  onChange={(event) => setBuilderBio(event.target.value)}
                  maxLength={280}
                  rows={3}
                  required
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Links"
            description="Add the places where curious people can try, read, or follow the work."
          >
            <div className="form-grid">
              <Field label="GitHub">
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(event) => setGithubUrl(event.target.value)}
                  placeholder="https://github.com/..."
                />
              </Field>
              <Field label="Live demo">
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(event) => setDemoUrl(event.target.value)}
                  placeholder="https://"
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
          </FormSection>

          <FormSection
            title="Media"
            description="A strong cover earns the first click. Everything you upload is stored on Shelby."
          >
            <div className="form-grid">
              <UploadField
                label="Cover image"
                hint={`JPG, PNG, WEBP, or GIF up to ${formatMB(MAX_COVER_BYTES)}`}
                icon={<ImagePlus className="h-5 w-5" />}
                file={cover}
                uploaded={coverUploaded}
                accept="image/jpeg,image/png,image/webp,image/gif"
                required
                onChange={(event) => chooseCover(event.target.files?.[0] ?? null, event.target)}
              />
              <UploadField
                label="Supporting file"
                hint={`Video or PDF, up to ${formatMB(MAX_MEDIA_BYTES)}. Optional.`}
                icon={<FileUp className="h-5 w-5" />}
                file={media}
                uploaded={mediaUploaded}
                accept="video/*,application/pdf"
                onChange={(event) => chooseMedia(event.target.files?.[0] ?? null, event.target)}
              />
            </div>
          </FormSection>

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
  count,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  count?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">
        <span>
          {label}
          {required && (
            <sup className="field__required" aria-label="required">
              *
            </sup>
          )}
        </span>
      </span>
      {children}
      {(hint || count) && (
        <span className="field__meta">
          {hint && <span>{hint}</span>}
          {count && <span>{count}</span>}
        </span>
      )}
    </label>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      <p className="form-section__description">{description}</p>
      <div className="form-section__fields">{children}</div>
    </fieldset>
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
