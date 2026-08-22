import { useEffect, useState, type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";
import { getVisitorId, hasLiked, markLiked, unmarkLiked } from "@/lib/likes";
import { likeProject } from "@/lib/server";
import { Button } from "@/components/ui/button";

type MaybeProject = { id: string; likes_count: number };
type CacheSnapshot = Array<[QueryKey, unknown]>;

type LikeMutationContext = {
  previous: CacheSnapshot;
};

function bumpLikes(data: unknown, projectId: string, delta: number): unknown {
  if (!data) return data;
  if (Array.isArray(data)) {
    return (data as MaybeProject[]).map((p) =>
      p && p.id === projectId ? { ...p, likes_count: Math.max(0, p.likes_count + delta) } : p,
    );
  }
  const one = data as MaybeProject;
  if (typeof one === "object" && one.id === projectId && typeof one.likes_count === "number") {
    return { ...one, likes_count: Math.max(0, one.likes_count + delta) };
  }
  return data;
}

export function LikeButton({
  projectId,
  count,
  size = "md",
}: {
  projectId: string;
  count: number;
  size?: "sm" | "md";
}) {
  const qc = useQueryClient();
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setLiked(hasLiked(projectId));
  }, [projectId]);

  const patchCaches = (delta: number) => {
    qc.setQueriesData({ queryKey: ["projects"] }, (data: unknown) =>
      bumpLikes(data, projectId, delta),
    );
  };

  const mutation = useMutation<boolean, Error, boolean, LikeMutationContext>({
    mutationFn: async (nextLiked) => {
      const result = await likeProject({
        data: { projectId, visitorId: getVisitorId() },
      });
      return Boolean(result.liked) === nextLiked;
    },
    onMutate: (nextLiked) => {
      const previous = qc.getQueriesData({ queryKey: ["projects"] });
      setLiked(nextLiked);
      patchCaches(nextLiked ? 1 : -1);
      return { previous };
    },
    onSuccess: (changed, nextLiked, context) => {
      if (nextLiked) {
        markLiked(projectId);
        if (!changed) {
          context?.previous.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data));
          toast.success("You already liked this project.");
        } else {
          toast.success("Thanks for the like!");
        }
      } else {
        unmarkLiked(projectId);
        toast.success("Like removed.");
      }
      void qc.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (_error, nextLiked, context) => {
      context?.previous.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data));
      setLiked(!nextLiked);
      toast.error(
        nextLiked
          ? "Couldn't save your like. Please try again."
          : "Couldn't remove your like. Please try again.",
      );
    },
  });

  const handle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mutation.isPending) return;
    mutation.mutate(!liked);
  };

  const isPending = mutation.isPending;
  const isDisabled = isPending;
  const label = isPending ? "Saving" : liked ? "Liked" : "Like";

  const px = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handle}
      disabled={isDisabled}
      aria-busy={isPending}
      aria-pressed={liked}
      aria-label={`${label} project`}
      className={`rounded-full ring-1 transition-colors ${px} ${
        liked
          ? "border-red-200 bg-red-50 text-red-600 ring-red-200 hover:bg-red-50 hover:text-red-600"
          : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
      } ${isPending ? "opacity-70" : ""}`}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
      <span className="font-medium">{label}</span>
      <span className="font-medium tabular-nums">{count}</span>
    </Button>
  );
}
