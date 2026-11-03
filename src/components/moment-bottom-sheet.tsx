"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  type TouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Maximize2,
  LoaderCircle,
  MessageCircle,
  MoreHorizontal,
  EyeOff,
  Pencil,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCrumbsAuth } from "@/hooks/use-crumbs-auth";
import { useScrollFade } from "@/hooks/use-scroll-fade";
import { isMomentVideo } from "@/lib/media";
import { getTripRepository } from "@/lib/repositories";
import { formatLastUpdated, formatMomentTimes } from "@/lib/time";
import { getTripThemeStyle } from "@/lib/trip-theme";
import { cn } from "@/lib/utils";
import type {
  Moment,
  MomentComment,
  MomentCommentAuthorKind,
  Trip,
} from "@/types/crumbs";

interface MomentBottomSheetProps {
  trip: Trip;
  moments: Moment[];
  navigationMoments?: Moment[];
  fullscreenMoments?: Moment[];
  selectedMomentId: string | null;
  open: boolean;
  canManage?: boolean;
  carouselTitle?: string;
  sidebarHeader?: ReactNode;
  sidebarEmptyState?: ReactNode;
  onClose: () => void;
  onSelectMoment?: (momentId: string) => void;
  onEdit?: (moment: Moment) => void;
  onHide?: (moment: Moment) => void;
  onDelete?: (moment: Moment) => void;
}

type MobileSwipeTransition = {
  direction: -1 | 1;
  phase: "leaving" | "waiting" | "entering";
  targetMomentId: string;
};

const momentCommentsCache = new Map<string, MomentComment[]>();
const pendingMomentComments = new Map<string, Promise<MomentComment[]>>();
const loadedPhotoUrls = new Set<string>();
const pendingPhotoPreloads = new Set<string>();

function markPhotoReady(imageUrl: string) {
  loadedPhotoUrls.add(imageUrl);
  pendingPhotoPreloads.delete(imageUrl);
}

function preloadPhoto(imageUrl: string) {
  if (loadedPhotoUrls.has(imageUrl) || pendingPhotoPreloads.has(imageUrl)) {
    return;
  }

  pendingPhotoPreloads.add(imageUrl);

  const image = new Image();
  image.onload = () => markPhotoReady(imageUrl);
  image.onerror = () => pendingPhotoPreloads.delete(imageUrl);
  image.src = imageUrl;

  if (image.complete) {
    if (image.naturalWidth > 0) {
      markPhotoReady(imageUrl);
    } else {
      pendingPhotoPreloads.delete(imageUrl);
    }
  }
}

function loadMomentComments(momentId: string) {
  const cachedComments = momentCommentsCache.get(momentId);

  if (cachedComments) {
    return Promise.resolve(cachedComments);
  }

  const pendingRequest = pendingMomentComments.get(momentId);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = getTripRepository()
    .listMomentComments(momentId)
    .then((comments) => {
      momentCommentsCache.set(momentId, comments);
      return comments;
    })
    .finally(() => {
      pendingMomentComments.delete(momentId);
    });

  pendingMomentComments.set(momentId, request);
  return request;
}

function isMissingCommentsTableError(error: unknown) {
  return (
    error instanceof Error &&
    error.message.includes("moment_comments") &&
    error.message.includes("schema cache")
  );
}

function useMomentComments(momentId: string, onLoaded?: () => void) {
  const [commentsResult, setCommentsResult] = useState<{
    momentId: string;
    comments: MomentComment[] | null;
  }>(() => ({
    momentId,
    comments: momentCommentsCache.get(momentId) ?? null,
  }));
  const comments =
    commentsResult.momentId === momentId ? commentsResult.comments : null;

  useEffect(() => {
    let mounted = true;

    void loadMomentComments(momentId)
      .then((nextComments) => {
        if (mounted) {
          setCommentsResult({ momentId, comments: nextComments });
          onLoaded?.();
        }
      })
      .catch((error) => {
        if (mounted) {
          setCommentsResult({ momentId, comments: [] });
          onLoaded?.();

          if (!isMissingCommentsTableError(error)) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Crumbs could not load comments.",
            );
          }
        }
      });

    return () => {
      mounted = false;
    };
  }, [momentId, onLoaded]);

  const addComment = useCallback(
    (comment: MomentComment) => {
      setCommentsResult((current) => {
        const nextComments =
          current.momentId === momentId && current.comments
            ? [...current.comments, comment]
            : [comment];

        momentCommentsCache.set(momentId, nextComments);
        return { momentId, comments: nextComments };
      });
    },
    [momentId],
  );

  return { comments, addComment };
}

function MomentCommentThread({
  authorKind,
  moment,
  trip,
  comments,
  onPosted,
  onBack,
}: {
  authorKind: MomentCommentAuthorKind;
  moment: Moment;
  trip: Trip;
  comments: MomentComment[] | null;
  onPosted: (comment: MomentComment) => void;
  onBack?: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useCrumbsAuth();
  const listRef = useRef<HTMLOListElement | null>(null);
  const listFadeRef = useScrollFade<HTMLOListElement>();
  const setListRef = useCallback(
    (node: HTMLOListElement | null) => {
      listRef.current = node;
      const cleanup = listFadeRef(node);

      return () => {
        listRef.current = null;
        cleanup?.();
      };
    },
    [listFadeRef],
  );
  const trimmedDraft = draft.trim();
  const visibleComments = comments ?? [];
  const loading = comments === null;
  const isTripOwner = user?.id === trip.ownerId;
  const needsDisplayName = Boolean(
    user && !isTripOwner && !user.displayName?.trim(),
  );
  const postingLabel = isTripOwner || authorKind === "traveler"
    ? "Posting as OP"
    : user?.displayName
      ? `Posting as @${user.displayName}`
      : user
        ? "Choose a display name to comment"
        : "Posting anonymously";

  // Newest comments sit at the bottom, like a conversation.
  useEffect(() => {
    const list = listRef.current;

    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [visibleComments.length]);

  async function handleSubmit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!trimmedDraft || saving) {
      return;
    }

    setSaving(true);

    try {
      const comment = await getTripRepository().createMomentComment({
        tripId: trip.id,
        momentId: moment.id,
        authorKind,
        body: trimmedDraft,
      });

      onPosted(comment);
      setDraft("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Crumbs could not post this comment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Comments" className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 pb-3">
        {onBack ? (
          <Button
            aria-label="Back to the moment"
            className="-ml-2 h-9 w-9"
            onClick={onBack}
            size="icon"
            type="button"
            variant="ghost"
          >
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </Button>
        ) : (
          <MessageCircle aria-hidden className="h-4 w-4 text-[var(--ink)]" />
        )}
        <h3 className="font-bold text-[var(--ink)]">Comments</h3>
        {visibleComments.length > 0 ? (
          <span className="tabular text-sm font-bold text-[var(--ink-soft)]">
            {visibleComments.length}
          </span>
        ) : null}
      </div>

      <ol
        className="no-scrollbar scroll-fade min-h-0 flex-1 space-y-4 overflow-y-auto"
        ref={setListRef}
      >
        {loading ? (
          <li className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-soft)]">
            <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
            Loading comments…
          </li>
        ) : visibleComments.length > 0 ? (
          visibleComments.map((comment) => (
            <li key={comment.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={comment.authorKind === "traveler" ? "accent" : "default"}
                >
                  {comment.authorEmail ? (
                    <span
                      aria-label={`@${comment.authorLabel}. Email: ${comment.authorEmail}`}
                      tabIndex={0}
                      title={comment.authorEmail}
                    >
                      @{comment.authorLabel}
                    </span>
                  ) : (
                    comment.authorLabel
                  )}
                </Badge>
                <span className="text-sm font-medium text-[var(--ink-soft)]">
                  {formatLastUpdated(comment.createdAt)}
                </span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[15px] font-medium leading-6 text-[var(--ink)]">
                {comment.body}
              </p>
            </li>
          ))
        ) : (
          <li className="text-[15px] font-medium text-[var(--ink-soft)]">
            No comments yet.
          </li>
        )}
      </ol>

      <form
        className="mt-3 shrink-0 border-t-2 border-[var(--line)] pt-3"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="flex items-end gap-2">
          <Textarea
            aria-label="Comment"
            className="no-scrollbar max-h-28 min-h-11 flex-1 resize-none py-2.5 [field-sizing:content]"
            maxLength={1000}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter posts; Shift+Enter starts a new line.
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            placeholder={visibleComments.length === 0 ? "Add the first comment" : "Write a comment"}
            rows={1}
            value={draft}
          />
          <Button
            aria-label="Post comment"
            disabled={saving || !trimmedDraft || needsDisplayName}
            size="icon"
            type="submit"
          >
            {saving ? (
              <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Send aria-hidden className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-sm font-medium text-[var(--ink-soft)]">
          {needsDisplayName ? (
            <Link className="underline underline-offset-4" href="/settings">
              Set your display name to comment
            </Link>
          ) : (
            postingLabel
          )}
        </p>
      </form>
    </section>
  );
}

// Long notes stay readable without a scroll bar: they scroll quietly and
// fade at the edge that has more text.
function FadingText({ className, children }: { className?: string; children: ReactNode }) {
  const fadeRef = useScrollFade<HTMLDivElement>();

  return (
    <div className={cn("no-scrollbar scroll-fade overflow-y-auto", className)} ref={fadeRef}>
      {children}
    </div>
  );
}

function formatPostedAt(timestamp: string) {
  const postedAt = new Date(timestamp);

  if (Number.isNaN(postedAt.getTime())) return "just now";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(postedAt);
}

function MomentSheetSlide({
  moment,
  trip,
  canManage,
  onOpenPhotoViewer,
  onMomentReady,
  onEdit,
  onHide,
  onDelete,
}: {
  moment: Moment;
  trip: Trip;
  canManage: boolean;
  onOpenPhotoViewer: (moment: Moment) => void;
  onMomentReady?: (momentId: string) => void;
  onEdit?: (moment: Moment) => void;
  onHide?: (moment: Moment) => void;
  onDelete?: (moment: Moment) => void;
}) {
  const times = formatMomentTimes(moment, trip.timezone);
  const isVideoMoment = isMomentVideo(moment);
  const momentTitle = getMomentTitle(moment);
  const hasMediaToLoad = moment.type === "photo" && Boolean(moment.imageUrl);
  const [view, setView] = useState<"moment" | "comments">("moment");
  const [mediaReady, setMediaReady] = useState(
    !hasMediaToLoad ||
      (!isVideoMoment && Boolean(moment.imageUrl && loadedPhotoUrls.has(moment.imageUrl))),
  );
  const [commentsReady, setCommentsReady] = useState(false);
  const hasReportedReadyRef = useRef(false);
  const markCommentsReady = useCallback(() => {
    setCommentsReady(true);
  }, []);
  const { comments, addComment } = useMomentComments(moment.id, markCommentsReady);
  const latestComment = comments?.at(-1) ?? null;
  const commentCount = comments?.length ?? 0;
  const tripTimeLabel =
    trip.coverLocationName?.split(",")[0]?.trim() ||
    trip.timezone.split("/").at(-1)?.replace(/_/g, " ") ||
    "trip time";
  const openViewerButton = (
    <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#15161c] bg-white text-[#15161c]">
      <Maximize2 aria-hidden className="h-4 w-4" />
    </span>
  );

  useEffect(() => {
    if (!mediaReady || !commentsReady || hasReportedReadyRef.current) {
      return;
    }

    hasReportedReadyRef.current = true;
    onMomentReady?.(moment.id);
  }, [commentsReady, mediaReady, moment.id, onMomentReady]);

  return (
    <article className="flex min-h-0 w-full flex-1 flex-col">
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5 lg:mx-auto lg:w-full lg:max-w-[34rem] lg:px-8 lg:py-6">
        <header className="shrink-0 space-y-2 pr-12">
          <h2
            className={cn(
              "font-display leading-tight text-[var(--ink)]",
              momentTitle.length > 70 ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl",
            )}
          >
            {momentTitle}
          </h2>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 text-[15px] font-medium text-[var(--ink-soft)]">
              <p className="flex flex-wrap items-center gap-x-1.5 font-bold">
                {isVideoMoment ? <Film aria-hidden className="h-4 w-4" /> : null}
                {moment.type === "photo" ? (isVideoMoment ? "Video" : "Photo") : "Note"}
                {moment.placeName ? ` · ${moment.placeName}` : null}
              </p>
              <p className="tabular">
                {times.tripLabel} in {tripTimeLabel}
                {times.viewerLabel ? ` · ${times.viewerLabel} your time` : null}
              </p>
            </div>
            {canManage && onHide && onDelete ? (
              <div className="flex shrink-0 items-center gap-1">
                {onEdit ? (
                  <Button
                    className="h-9 px-3"
                    onClick={() => onEdit(moment)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Pencil aria-hidden className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-label="Moment options" className="h-9 w-9" size="icon" variant="ghost">
                      <MoreHorizontal aria-hidden className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onHide(moment)}>
                      <EyeOff aria-hidden className="h-4 w-4" />
                      Hide from viewers
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      data-destructive
                      className="text-[var(--danger)]"
                      onClick={() => onDelete(moment)}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                      Delete moment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : null}
          </div>
        </header>

        {view === "comments" ? (
          <MomentCommentThread
            authorKind={canManage ? "traveler" : "viewer"}
            comments={comments}
            moment={moment}
            onBack={() => setView("moment")}
            onPosted={addComment}
            trip={trip}
          />
        ) : (
          <>
            {moment.type === "photo" && moment.imageUrl ? (
              isVideoMoment ? (
                <div className="relative flex min-h-36 flex-1 items-center justify-center">
                  <video
                    className="max-h-full max-w-full rounded-xl bg-black"
                    controls
                    onError={() => setMediaReady(true)}
                    onLoadedData={() => setMediaReady(true)}
                    playsInline
                    preload="metadata"
                    src={moment.imageUrl}
                  />
                  <button
                    aria-label="Open full-screen video"
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#15161c] bg-white text-[#15161c]"
                    onClick={() => onOpenPhotoViewer(moment)}
                    title="Open full-screen video"
                    type="button"
                  >
                    <Maximize2 aria-hidden className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  aria-label="Open full-screen photo"
                  className="group relative flex min-h-36 flex-1 items-center justify-center rounded-xl"
                  data-moment-media
                  onClick={() => onOpenPhotoViewer(moment)}
                  title="Open full-screen photo"
                  type="button"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={moment.caption ?? moment.placeName ?? "Trip photo"}
                    className="max-h-full max-w-full rounded-xl bg-[var(--paper-strong)] object-contain transition-transform duration-300 group-hover:scale-[1.01]"
                    onError={() => setMediaReady(true)}
                    onLoad={() => {
                      if (moment.imageUrl) {
                        markPhotoReady(moment.imageUrl);
                      }
                      setMediaReady(true);
                    }}
                    src={moment.imageUrl}
                  />
                  {openViewerButton}
                </button>
              )
            ) : (
              <div className="relative flex min-h-28 flex-1 flex-col rounded-xl bg-[var(--paper)]">
                <FadingText className="min-h-0 flex-1 p-5 pr-14 text-lg font-medium leading-8 text-[var(--ink)]">
                  {moment.thoughtText ?? moment.caption ?? "A quiet note from the trip."}
                </FadingText>
                <button
                  aria-label="Open full-screen note"
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#15161c] bg-white text-[#15161c]"
                  data-moment-media
                  onClick={() => onOpenPhotoViewer(moment)}
                  title="Open full-screen note"
                  type="button"
                >
                  <Maximize2 aria-hidden className="h-4 w-4" />
                </button>
              </div>
            )}

            {moment.type === "photo" && moment.thoughtText ? (
              <FadingText className="max-h-32 shrink-0 text-[17px] font-medium leading-7 text-[var(--ink)]">
                {moment.thoughtText}
              </FadingText>
            ) : null}

            <button
              aria-label={
                commentCount > 0
                  ? `Open ${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
                  : "Open comments"
              }
              className="flex w-full shrink-0 items-center gap-3 rounded-xl border-2 border-[var(--line)] px-4 py-3 text-left transition-colors hover:border-[var(--ink)]"
              data-swipe-exempt
              onClick={() => setView("comments")}
              type="button"
            >
              <MessageCircle aria-hidden className="h-5 w-5 shrink-0 text-[var(--ink)]" />
              <span className="min-w-0 flex-1">
                <span className="tabular block font-bold text-[var(--ink)]">
                  {commentCount > 0
                    ? `${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
                    : "Comments"}
                </span>
                <span className="block truncate text-sm font-medium text-[var(--ink-soft)]">
                  {latestComment
                    ? `${latestComment.authorLabel}: ${latestComment.body}`
                    : comments === null
                      ? "Loading…"
                      : "No comments yet"}
                </span>
              </span>
              <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-[var(--ink)]" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function getMomentTitle(moment: Moment) {
  const caption = moment.caption?.trim();

  if (caption) {
    return caption;
  }

  const note = moment.thoughtText?.trim();

  if (note) {
    return note.length > 96 ? `${note.slice(0, 93)}...` : note;
  }

  return "Untitled moment";
}

function getMomentLocationLabel(moment: Moment) {
  if (moment.placeName) {
    return moment.placeName;
  }

  if (
    typeof moment.latitude === "number" &&
    typeof moment.longitude === "number"
  ) {
    return `${moment.latitude.toFixed(4)}, ${moment.longitude.toFixed(4)}`;
  }

  return "Location not saved";
}

function FullscreenMomentMedia({
  moment,
  isVideoMoment,
}: {
  moment: Moment;
  isVideoMoment: boolean;
}) {
  const hasMediaToLoad = moment.type === "photo" && Boolean(moment.imageUrl);
  const [mediaReady, setMediaReady] = useState(
    !hasMediaToLoad ||
      (!isVideoMoment && Boolean(moment.imageUrl && loadedPhotoUrls.has(moment.imageUrl))),
  );

  return (
    <div
      aria-busy={!mediaReady}
      className="relative flex min-h-0 flex-1 items-center justify-center"
    >
      {moment.type === "photo" && moment.imageUrl ? (
        isVideoMoment ? (
          <video
            className={cn(
              "max-h-[calc(100dvh-25rem)] max-w-full bg-black object-contain transition-opacity duration-200 lg:max-h-[calc(100dvh-3rem)]",
              !mediaReady && "opacity-0",
            )}
            controls
            onError={() => setMediaReady(true)}
            onLoadedData={() => setMediaReady(true)}
            playsInline
            preload="metadata"
            src={moment.imageUrl}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={moment.caption ?? moment.placeName ?? "Trip photo"}
            className={cn(
              "max-h-[calc(100dvh-25rem)] max-w-full object-contain transition-opacity duration-200 lg:max-h-[calc(100dvh-3rem)]",
              !mediaReady && "opacity-0",
            )}
            onError={() => setMediaReady(true)}
            onLoad={() => {
              if (moment.imageUrl) {
                markPhotoReady(moment.imageUrl);
              }
              setMediaReady(true);
            }}
            src={moment.imageUrl}
          />
        )
      ) : (
        <div className="max-w-2xl rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] p-6 text-lg font-medium leading-8 text-[var(--ink)] sm:p-8 sm:text-xl">
          {moment.thoughtText ?? moment.caption ?? "A quiet note from the trip."}
        </div>
      )}
      {!mediaReady ? (
        <div
          aria-live="polite"
          className="absolute inset-0 flex items-center justify-center"
          role="status"
        >
          <div className="flex items-center gap-2 rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--ink)]">
            <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
            Loading photo…
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FullscreenNotes({
  moment,
  trip,
  canManage,
}: {
  moment: Moment;
  trip: Trip;
  canManage: boolean;
}) {
  const { comments, addComment } = useMomentComments(moment.id);

  return (
    <aside className="flex h-[min(22rem,40dvh)] w-full shrink-0 flex-col rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)] p-5 lg:h-[calc(100dvh-3rem)] lg:w-[360px]">
      <FadingText className="max-h-[45%] shrink-0 space-y-1 pb-3">
        <p className="whitespace-pre-wrap font-display text-2xl leading-tight text-[var(--ink)]">
          {getMomentTitle(moment)}
        </p>
        <p className="text-sm font-medium text-[var(--ink-soft)]">
          Posted {formatPostedAt(moment.postedAt)}
        </p>
        <p className="text-sm font-medium text-[var(--ink-soft)]">
          {getMomentLocationLabel(moment)}
        </p>
        {moment.type === "photo" && moment.thoughtText ? (
          <p className="pt-2 text-[15px] font-medium leading-6 text-[var(--ink)]">
            {moment.thoughtText}
          </p>
        ) : null}
      </FadingText>
      <MomentCommentThread
        authorKind={canManage ? "traveler" : "viewer"}
        comments={comments}
        moment={moment}
        onPosted={addComment}
        trip={trip}
      />
    </aside>
  );
}

function MomentFullscreenViewer({
  activeMomentId,
  moments,
  trip,
  canManage,
  onClose,
  onSelectMoment,
}: {
  activeMomentId: string | null;
  moments: Moment[];
  trip: Trip;
  canManage: boolean;
  onClose: () => void;
  onSelectMoment: (momentId: string) => void;
}) {
  const touchStartXRef = useRef<number | null>(null);
  const activeMomentIndex = moments.findIndex(
    (moment) => moment.id === activeMomentId,
  );
  const activeIndex = Math.max(0, activeMomentIndex);
  const moment = activeMomentIndex >= 0 ? moments[activeIndex] ?? null : null;
  const hasMultipleMoments = moments.length > 1;
  const canSelectPrevious = hasMultipleMoments && activeIndex > 0;
  const canSelectNext = hasMultipleMoments && activeIndex < moments.length - 1;
  const isVideoMoment = moment ? isMomentVideo(moment) : false;

  const selectMomentAtIndex = useCallback(
    (nextIndex: number) => {
      const nextMoment = moments[nextIndex];

      if (!nextMoment) {
        return;
      }

      onSelectMoment(nextMoment.id);
    },
    [moments, onSelectMoment],
  );

  function handleTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartXRef.current = null;

    if (startX === null || endX === undefined) {
      return;
    }

    const deltaX = endX - startX;

    if (Math.abs(deltaX) < 48) {
      return;
    }

    if (deltaX > 0 && canSelectPrevious) {
      selectMomentAtIndex(activeIndex - 1);
    }

    if (deltaX < 0 && canSelectNext) {
      selectMomentAtIndex(activeIndex + 1);
    }
  }

  useEffect(() => {
    if (!moment) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }

      if (event.key === "ArrowLeft" && canSelectPrevious) {
        selectMomentAtIndex(activeIndex - 1);
      }

      if (event.key === "ArrowRight" && canSelectNext) {
        selectMomentAtIndex(activeIndex + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeIndex,
    canSelectNext,
    canSelectPrevious,
    moment,
    onClose,
    selectMomentAtIndex,
  ]);

  useEffect(() => {
    [moments[activeIndex - 1], moments[activeIndex + 1]].forEach(
      (nearbyMoment) => {
        if (nearbyMoment?.type === "photo" && nearbyMoment.imageUrl) {
          preloadPhoto(nearbyMoment.imageUrl);
        }
      },
    );
  }, [activeIndex, moments]);

  if (!moment) {
    return null;
  }

  return (
    <div
      aria-label="Full-screen moment"
      aria-modal="true"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[rgb(10_11_15/0.94)] p-3 text-[var(--ink)] sm:p-6"
      data-trip-theme={trip.theme}
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      role="dialog"
      style={getTripThemeStyle(trip.theme)}
    >
      <button
        aria-label="Dismiss full-screen photo"
        className="absolute inset-0 cursor-zoom-out"
        onClick={onClose}
        type="button"
      />
      <Button
        className="absolute right-3 top-3 z-20 h-11 w-11 bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--paper-strong)] sm:right-5 sm:top-5"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        size="icon"
        title="Close full-screen moment"
        type="button"
        variant="ghost"
      >
        <X className="h-5 w-5" />
        <span className="sr-only">Close full-screen moment</span>
      </Button>
      {hasMultipleMoments ? (
        <>
          <Button
            className="absolute left-3 top-1/2 z-20 h-11 w-11 -translate-y-1/2 bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--paper-strong)] sm:left-5 sm:h-12 sm:w-12"
            disabled={!canSelectPrevious}
            onClick={() => selectMomentAtIndex(activeIndex - 1)}
            size="icon"
            title="Previous moment"
            type="button"
            variant="ghost"
          >
            <ChevronLeft className="h-6 w-6" />
            <span className="sr-only">Previous moment</span>
          </Button>
          <Button
            className="absolute right-3 top-1/2 z-20 h-11 w-11 -translate-y-1/2 bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--paper-strong)] sm:right-5 sm:h-12 sm:w-12"
            disabled={!canSelectNext}
            onClick={() => selectMomentAtIndex(activeIndex + 1)}
            size="icon"
            title="Next moment"
            type="button"
            variant="ghost"
          >
            <ChevronRight className="h-6 w-6" />
            <span className="sr-only">Next moment</span>
          </Button>
          <div className="tabular absolute left-3 top-3 z-20 rounded-full bg-[var(--surface)] px-3 py-1 text-sm font-bold text-[var(--ink)] sm:left-5 sm:top-5">
            {activeIndex + 1} / {moments.length}
          </div>
        </>
      ) : null}
      <div className="relative z-10 flex h-full w-full max-w-[1500px] flex-col justify-center gap-3 lg:flex-row lg:items-center lg:gap-6">
        <FullscreenMomentMedia
          isVideoMoment={isVideoMoment}
          key={moment.id}
          moment={moment}
        />
        <FullscreenNotes
          canManage={canManage}
          key={moment.id}
          moment={moment}
          trip={trip}
        />
      </div>
    </div>
  );
}

export function MomentBottomSheet({
  trip,
  moments,
  navigationMoments,
  fullscreenMoments,
  selectedMomentId,
  open,
  canManage = false,
  carouselTitle,
  sidebarHeader,
  sidebarEmptyState,
  onClose,
  onSelectMoment,
  onEdit,
  onHide,
  onDelete,
}: MomentBottomSheetProps) {
  const [fullscreenMomentId, setFullscreenMomentId] = useState<string | null>(null);
  const [readyMomentId, setReadyMomentId] = useState<string | null>(null);
  const [mobileSwipeTransition, setMobileSwipeTransition] =
    useState<MobileSwipeTransition | null>(null);
  const mobileSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const mobileSwipeTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mobileSwipeTransitioningRef = useRef(false);
  const activeMoment =
    moments.find((moment) => moment.id === selectedMomentId) ?? moments[0] ?? null;
  const activeNavigationMoments =
    navigationMoments?.some((moment) => moment.id === selectedMomentId)
      ? navigationMoments
      : moments;
  const selectedNavigationIndex = Math.max(
    0,
    activeNavigationMoments.findIndex((moment) => moment.id === selectedMomentId),
  );
  const hasMultipleNavigationMoments = activeNavigationMoments.length > 1;
  const activeFullscreenMoments =
    fullscreenMoments?.some((moment) => moment.id === fullscreenMomentId)
      ? fullscreenMoments
      : moments;
  const activeMomentReady = activeMoment?.id === readyMomentId;

  const handleMomentReady = useCallback((momentId: string) => {
    setReadyMomentId((currentMomentId) =>
      currentMomentId === momentId ? currentMomentId : momentId,
    );
  }, []);

  const selectMomentAtIndex = useCallback(
    (nextIndex: number) => {
      const moment = activeNavigationMoments[nextIndex];

      if (!moment) {
        return;
      }

      onSelectMoment?.(moment.id);
    },
    [activeNavigationMoments, onSelectMoment],
  );

  function startMobileSwipeTransition(direction: -1 | 1) {
    const targetMoment = activeNavigationMoments[selectedNavigationIndex + direction];

    if (!targetMoment || !onSelectMoment || mobileSwipeTransitioningRef.current) {
      return;
    }

    mobileSwipeTransitioningRef.current = true;
    setMobileSwipeTransition({
      direction,
      phase: "leaving",
      targetMomentId: targetMoment.id,
    });

    mobileSwipeTransitionTimerRef.current = setTimeout(() => {
      setMobileSwipeTransition((currentTransition) =>
        currentTransition?.targetMomentId === targetMoment.id
          ? { ...currentTransition, phase: "waiting" }
          : currentTransition,
      );
      onSelectMoment(targetMoment.id);
    }, 180);
  }

  function handleMobileSwipeStart(event: TouchEvent<HTMLDivElement>) {
    if (
      window.matchMedia("(min-width: 1024px)").matches ||
      event.touches.length !== 1 ||
      (event.target instanceof Element &&
        event.target.closest(
          "textarea, input, select, form, video, [data-swipe-exempt], button:not([data-moment-media])",
        ))
    ) {
      mobileSwipeStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    mobileSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }

  function handleMobileSwipeMove(event: TouchEvent<HTMLDivElement>) {
    const start = mobileSwipeStartRef.current;
    const touch = event.touches[0];

    if (!start || !touch) {
      return;
    }

    const horizontalDistance = Math.abs(touch.clientX - start.x);
    const verticalDistance = Math.abs(touch.clientY - start.y);

    if (horizontalDistance > 8 && horizontalDistance > verticalDistance) {
      event.preventDefault();
    }
  }

  function handleMobileSwipeEnd(event: TouchEvent<HTMLDivElement>) {
    const start = mobileSwipeStartRef.current;
    const touch = event.changedTouches[0];
    mobileSwipeStartRef.current = null;

    if (!start || !touch) {
      return;
    }

    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;

    if (
      Math.abs(horizontalDistance) < 48 ||
      Math.abs(horizontalDistance) <= Math.abs(verticalDistance)
    ) {
      return;
    }

    event.preventDefault();
    startMobileSwipeTransition(horizontalDistance > 0 ? -1 : 1);
  }

  useEffect(() => {
    return () => {
      if (mobileSwipeTransitionTimerRef.current) {
        clearTimeout(mobileSwipeTransitionTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (
      !open ||
      fullscreenMomentId ||
      !hasMultipleNavigationMoments ||
      !onSelectMoment
    ) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!window.matchMedia("(min-width: 1024px)").matches) {
        return;
      }

      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target instanceof Element &&
          event.target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }

      if (event.key === "ArrowLeft" && selectedNavigationIndex > 0) {
        event.preventDefault();
        selectMomentAtIndex(selectedNavigationIndex - 1);
      }

      if (
        event.key === "ArrowRight" &&
        selectedNavigationIndex < activeNavigationMoments.length - 1
      ) {
        event.preventDefault();
        selectMomentAtIndex(selectedNavigationIndex + 1);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    activeNavigationMoments.length,
    fullscreenMomentId,
    hasMultipleNavigationMoments,
    onSelectMoment,
    open,
    selectMomentAtIndex,
    selectedNavigationIndex,
  ]);

  useEffect(() => {
    if (
      mobileSwipeTransition?.phase !== "waiting" ||
      !activeMomentReady ||
      activeMoment?.id !== mobileSwipeTransition.targetMomentId
    ) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setMobileSwipeTransition((currentTransition) =>
        currentTransition?.phase === "waiting"
          ? { ...currentTransition, phase: "entering" }
          : currentTransition,
      );
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [activeMoment?.id, activeMomentReady, mobileSwipeTransition]);

  useEffect(() => {
    if (mobileSwipeTransition?.phase !== "entering") {
      return;
    }

    const transitionTimer = window.setTimeout(() => {
      mobileSwipeTransitioningRef.current = false;
      setMobileSwipeTransition(null);
    }, 200);

    return () => {
      window.clearTimeout(transitionTimer);
    };
  }, [mobileSwipeTransition]);

  useEffect(() => {
    const nearbyMoments = [
      activeNavigationMoments[selectedNavigationIndex - 1],
      activeNavigationMoments[selectedNavigationIndex + 1],
    ].filter((moment): moment is Moment => Boolean(moment));

    nearbyMoments.forEach((moment) => {
      if (moment.type === "photo" && moment.imageUrl) {
        preloadPhoto(moment.imageUrl);
      }

      void loadMomentComments(moment.id).catch(() => undefined);
    });
  }, [activeNavigationMoments, selectedNavigationIndex]);

  const momentNavigator = hasMultipleNavigationMoments ? (
    <div
      aria-label={carouselTitle ?? `${activeNavigationMoments.length} moments in this view`}
      className="flex items-center justify-center gap-4"
    >
      <Button
        aria-label="Previous moment"
        className="h-12 w-12"
        disabled={selectedNavigationIndex === 0}
        onClick={() => selectMomentAtIndex(selectedNavigationIndex - 1)}
        size="icon"
        type="button"
        variant="outline"
      >
        <ChevronLeft aria-hidden className="h-5 w-5" />
      </Button>
      <span className="tabular min-w-16 text-center font-bold text-[var(--ink)]">
        {selectedNavigationIndex + 1} / {activeNavigationMoments.length}
      </span>
      <Button
        aria-label="Next moment"
        className="h-12 w-12"
        disabled={selectedNavigationIndex === activeNavigationMoments.length - 1}
        onClick={() => selectMomentAtIndex(selectedNavigationIndex + 1)}
        size="icon"
        type="button"
        variant="outline"
      >
        <ChevronRight aria-hidden className="h-5 w-5" />
      </Button>
    </div>
  ) : null;
  const mobileSlideClass =
    mobileSwipeTransition?.phase === "leaving"
      ? mobileSwipeTransition.direction === 1
        ? "-translate-x-full transition-transform duration-200 ease-out"
        : "translate-x-full transition-transform duration-200 ease-out"
      : mobileSwipeTransition?.phase === "waiting"
        ? mobileSwipeTransition.direction === 1
          ? "translate-x-full transition-none"
          : "-translate-x-full transition-none"
        : mobileSwipeTransition?.phase === "entering"
          ? "translate-x-0 transition-transform duration-200 ease-out"
          : "translate-x-0";

  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 transition-[translate,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] sm:p-4",
          sidebarHeader && "lg:inset-y-0 lg:left-0 lg:right-auto lg:w-[clamp(24rem,34vw,38rem)] lg:p-0",
          // With a sidebar the panel never leaves large screens; on phones it
          // still slides up from the bottom when a moment opens.
          open
            ? "translate-y-0 opacity-100"
            : sidebarHeader
              ? "max-lg:translate-y-full max-lg:opacity-0"
              : "translate-y-full opacity-0",
        )}
      >
        <div className={cn(
          "pointer-events-auto mx-auto flex h-[min(46rem,calc(100dvh_-_9rem_-_env(safe-area-inset-bottom)))] max-w-xl flex-col overflow-hidden rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] shadow-[0_16px_32px_-16px_rgb(0_0_0/0.4)]",
          sidebarHeader && "lg:relative lg:flex lg:h-full lg:max-h-none lg:max-w-none lg:flex-col lg:overflow-hidden lg:rounded-none lg:border-0 lg:border-r-2 lg:border-r-[var(--line)] lg:shadow-none",
          sidebarHeader && !activeMoment && "max-lg:hidden",
        )}>
          {sidebarHeader ? (
            <div className="hidden lg:block lg:shrink-0">{sidebarHeader}</div>
          ) : null}
          {activeMoment ? (
            <div className="sticky top-0 z-30 h-0 shrink-0 lg:hidden">
              <Button
                aria-label="Close moment"
                className="absolute right-3 top-3 h-10 w-10 bg-[var(--surface)]"
                data-swipe-exempt
                onClick={onClose}
                size="icon"
                type="button"
                variant="outline"
              >
                <X aria-hidden className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
          {activeMoment ? (
            <div
              aria-busy={!activeMomentReady}
              className={cn(
                "relative flex min-h-0 flex-1 flex-col overflow-hidden [touch-action:pan-y] lg:translate-x-0 lg:transition-none",
                mobileSlideClass,
              )}
              onTouchCancel={() => {
                mobileSwipeStartRef.current = null;
              }}
              onTouchEnd={handleMobileSwipeEnd}
              onTouchMove={handleMobileSwipeMove}
              onTouchStart={handleMobileSwipeStart}
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <MomentSheetSlide
                  key={activeMoment.id}
                  canManage={canManage}
                  moment={activeMoment}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onHide={onHide}
                  onMomentReady={handleMomentReady}
                  onOpenPhotoViewer={(moment) => setFullscreenMomentId(moment.id)}
                  trip={trip}
                />
              </div>
              {sidebarHeader && momentNavigator ? (
                <div className="hidden border-t-2 border-[var(--line)] bg-[var(--surface)] px-8 py-4 lg:block lg:shrink-0">
                  {momentNavigator}
                </div>
              ) : null}
              <Button
                aria-label="Close moment"
                className="absolute right-5 top-5 z-30 hidden h-10 w-10 bg-[var(--surface)] lg:inline-flex"
                data-swipe-exempt
                onClick={onClose}
                size="icon"
                type="button"
                variant="outline"
              >
                <X aria-hidden className="h-4 w-4" />
              </Button>
              {!activeMomentReady ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-[var(--surface)] pt-28 lg:items-center lg:pt-0">
                  <p className="flex items-center gap-2 text-sm font-bold text-[var(--ink-soft)]" role="status">
                    <LoaderCircle aria-hidden className="h-4 w-4 animate-spin" />
                    Loading moment…
                  </p>
                </div>
              ) : null}
            </div>
          ) : sidebarEmptyState ? (
            <div className="pointer-events-none hidden lg:flex lg:min-h-0 lg:flex-1 lg:items-center lg:justify-center lg:p-8">
              {sidebarEmptyState}
            </div>
          ) : null}
        </div>
      </div>
      <MomentFullscreenViewer
        activeMomentId={fullscreenMomentId}
        canManage={canManage}
        moments={activeFullscreenMoments}
        trip={trip}
        onClose={() => setFullscreenMomentId(null)}
        onSelectMoment={setFullscreenMomentId}
      />
    </>
  );
}
