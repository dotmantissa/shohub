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
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("AI");
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
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
    if (!description.trim() || description.trim().length > 120) {
      toast.error("Keep the description between 1 and 120 characters.");
      return false;
    }
    if (!isHttpUrl(githubUrl.trim()) || !isHttpUrl(demoUrl.trim())) {
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
        description: description.trim(),
        category,
        githubUrl: githubUrl.trim() || null,
        demoUrl: demoUrl.trim() || null,
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
          description: description.trim(),
          category,
          githubUrl: githubUrl.trim() || null,
          demoUrl: demoUrl.trim() || null,
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
            <Field label="Project name">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={96}
              />
            </Field>
            <Field label="Builder name">
              <input
                value={builder}
                onChange={(event) => setBuilder(event.target.value)}
                maxLength={80}
              />
            </Field>
          </div>

          <Field label="One line about it" hint={`${description.length}/120`}>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={120}
              rows={3}
            />
          </Field>

          <Field label="Category">
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as Category)}
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
            <UploadField
              label="Cover image"
              hint={`Up to ${formatMB(MAX_COVER_BYTES)}`}
              icon={<ImagePlus className="h-5 w-5" />}
              file={cover}
              uploaded={coverUploaded}
              accept="image/jpeg,image/png,image/webp,image/gif"
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
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field__label">
        {label}
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
  onChange,
}: {
  label: string;
  hint: string;
  icon: React.ReactNode;
  file: File | null;
  uploaded: boolean;
  accept: string;
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
      <input type="file" accept={accept} onChange={onChange} />
    </label>
  );
}
