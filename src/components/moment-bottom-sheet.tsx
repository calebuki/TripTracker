"use client";

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
import { isMomentVideo } from "@/lib/media";
import { getTripRepository } from "@/lib/repositories";
import { formatLastUpdated, formatMomentTimes } from "@/lib/time";
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

function MomentComments({
  authorKind,
  moment,
  trip,
  variant = "sheet",
  onLoaded,
}: {
  authorKind: MomentCommentAuthorKind;
  moment: Moment;
  trip: Trip;
  variant?: "sheet" | "viewer";
  onLoaded?: () => void;
}) {
  const [commentsResult, setCommentsResult] = useState<{
    momentId: string;
    comments: MomentComment[] | null;
  }>(() => ({
    momentId: moment.id,
    comments: momentCommentsCache.get(moment.id) ?? null,
  }));
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const trimmedDraft = draft.trim();
  const comments =
    commentsResult.momentId === moment.id ? commentsResult.comments : null;
  const visibleComments = comments ?? [];
  const loading = comments === null;
  const isViewer = variant === "viewer";

  function isMissingCommentsTableError(error: unknown) {
    return (
      error instanceof Error &&
      error.message.includes("moment_comments") &&
      error.message.includes("schema cache")
    );
  }

  useEffect(() => {
    let mounted = true;

    void loadMomentComments(moment.id)
      .then((nextComments) => {
        if (mounted) {
          setCommentsResult({
            momentId: moment.id,
            comments: nextComments,
          });
          onLoaded?.();
        }
      })
      .catch((error) => {
        if (mounted) {
          setCommentsResult({
            momentId: moment.id,
            comments: [],
          });
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
  }, [moment.id, onLoaded]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!trimmedDraft) {
      toast.error("Write a comment before posting.");
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

      setCommentsResult((current) => {
        const nextComments =
          current.momentId === moment.id && current.comments
            ? [...current.comments, comment]
            : [comment];

        momentCommentsCache.set(moment.id, nextComments);

        return {
          momentId: moment.id,
          comments: nextComments,
        };
      });
      setDraft("");
      toast.success("Comment posted.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Crumbs could not post this comment.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={cn("space-y-3", isViewer ? "mt-5 border-t border-white/15 pt-5" : "mt-4 border-t border-black/5 pt-4")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MessageCircle className={cn("h-4 w-4", isViewer ? "text-white/60" : "text-slate-500")} />
          <p className={cn("text-sm font-medium", isViewer ? "text-white" : "text-[var(--ink)]")}>Comments</p>
        </div>
        {visibleComments.length > 0 ? (
          <Badge variant="subtle">{visibleComments.length}</Badge>
        ) : null}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className={cn("flex items-center gap-2 rounded-[22px] px-4 py-3 text-sm", isViewer ? "bg-white/10 text-white/70" : "bg-[var(--paper)] text-slate-600")}>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading comments...
          </div>
        ) : visibleComments.length > 0 ? (
          visibleComments.map((comment) => (
            <div
              className={cn("rounded-[22px] px-4 py-3", isViewer ? "bg-white/10" : "bg-[var(--paper)]")}
              key={comment.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="font-mono"
                  variant={comment.authorKind === "traveler" ? "accent" : "subtle"}
                >
                  {comment.authorLabel}
                </Badge>
                <span className={cn("text-xs", isViewer ? "text-white/60" : "text-slate-500")}>
                  {formatLastUpdated(comment.createdAt)}
                </span>
              </div>
              <p className={cn("mt-2 whitespace-pre-wrap text-sm leading-6", isViewer ? "text-white" : "text-[var(--ink)]")}>
                {comment.body}
              </p>
            </div>
          ))
        ) : isViewer ? null : (
          <p className={cn("rounded-[22px] px-4 py-3 text-sm", isViewer ? "bg-white/10 text-white/70" : "bg-[var(--paper)] text-slate-600")}>
            No comments yet.
          </p>
        )}
      </div>

      <form className="space-y-2" onSubmit={(event) => void handleSubmit(event)}>
        <Textarea
          className={cn(
            "min-h-20 rounded-[22px]",
            isViewer && "border-white/15 bg-white/10 text-white placeholder:text-white/60 focus:border-white/30",
          )}
          maxLength={1000}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={visibleComments.length === 0 ? "Add the first comment" : "Write a comment"}
          rows={2}
          value={draft}
        />
        <div className="flex items-center justify-between gap-3">
          <p className={cn("text-xs", isViewer ? "text-white/60" : "text-slate-500")}>
            {authorKind === "traveler" ? "Posting as OP" : "Posting anonymously"}
          </p>
          <Button disabled={saving || !trimmedDraft} size="sm" type="submit">
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Post
          </Button>
        </div>
      </form>
    </section>
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
  const [mediaReady, setMediaReady] = useState(!hasMediaToLoad);
  const [commentsReady, setCommentsReady] = useState(false);
  const hasReportedReadyRef = useRef(false);
  const markCommentsReady = useCallback(() => {
    setCommentsReady(true);
  }, []);
  const tripTimeLabel =
    trip.coverLocationName?.split(",")[0]?.trim() ||
    trip.timezone.split("/").at(-1)?.replace(/_/g, " ") ||
    "Trip";
  const openViewerButton = (
    <span className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[var(--ink)] shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
      <Maximize2 className="h-4 w-4" />
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
    <article className="w-full lg:flex lg:min-h-full lg:flex-col">
      <div className="px-4 py-4 sm:px-5 sm:py-5 lg:mx-auto lg:flex lg:min-h-full lg:w-full lg:max-w-[34rem] lg:flex-1 lg:flex-col lg:justify-center lg:px-8 lg:py-6">
        <div className="flex flex-col gap-6 lg:gap-8">
          {moment.type === "photo" && moment.imageUrl ? (
            <div className="order-2 space-y-3">
              <div className="overflow-hidden rounded-[26px] bg-[var(--paper)]">
                {isVideoMoment ? (
                  <div className="relative">
                    <video
                      className="h-64 w-full bg-black object-cover sm:h-80"
                      controls
                      onError={() => setMediaReady(true)}
                      onLoadedData={() => setMediaReady(true)}
                      playsInline
                      preload="metadata"
                      src={moment.imageUrl}
                    />
                    <button
                      aria-label="Open full-screen video"
                      className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[var(--ink)] shadow-[0_12px_30px_rgba(15,23,42,0.16)]"
                      onClick={() => onOpenPhotoViewer(moment)}
                      title="Open full-screen video"
                      type="button"
                    >
                      <Maximize2 className="h-4 w-4" />
                      <span className="sr-only">Open full-screen video</span>
                    </button>
                  </div>
                ) : (
                  <button
                    aria-label="Open full-screen photo"
                    className="group relative block w-full overflow-hidden text-left"
                    data-moment-media
                    onClick={() => onOpenPhotoViewer(moment)}
                    title="Open full-screen photo"
                    type="button"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={moment.caption ?? moment.placeName ?? "Trip photo"}
                      className="h-64 w-full object-cover transition duration-300 group-hover:scale-[1.01] sm:h-80"
                      onError={() => setMediaReady(true)}
                      onLoad={() => setMediaReady(true)}
                      src={moment.imageUrl}
                    />
                    {openViewerButton}
                  </button>
                )}
              </div>
              {moment.thoughtText ? (
                <div className="rounded-[24px] bg-[var(--paper)] p-4 text-sm leading-7 text-[var(--ink)]">
                  {moment.thoughtText}
                </div>
              ) : null}
            </div>
          ) : (
            <button
              aria-label="Open full-screen moment"
              className="order-2 relative block w-full rounded-[26px] bg-[var(--paper)] p-5 text-left text-base leading-7 text-[var(--ink)]"
              data-moment-media
              onClick={() => onOpenPhotoViewer(moment)}
              title="Open full-screen moment"
              type="button"
            >
              {moment.thoughtText ?? moment.caption ?? "A quiet note from the trip."}
              {openViewerButton}
            </button>
          )}

          <div className="contents">
            <div className="order-3 flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">
                  {moment.type === "photo"
                    ? isVideoMoment
                      ? "Video"
                      : "Photo"
                    : "Thought"}
                </Badge>
                {isVideoMoment ? (
                  <Badge variant="subtle">
                    <Film className="mr-1 h-3 w-3" />
                    Captured media
                  </Badge>
                ) : null}
                {moment.placeName ? (
                  <Badge variant="subtle">{moment.placeName}</Badge>
                ) : null}
              </div>
              {canManage && onHide && onDelete ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-10 w-10" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Moment options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onEdit ? (
                      <DropdownMenuItem onClick={() => onEdit(moment)}>
                        Edit details
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem onClick={() => onHide(moment)}>
                      <EyeOff className="mr-2 h-4 w-4" />
                      Hide from viewers
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-[#7f1d1d]"
                      onClick={() => onDelete(moment)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete moment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>

            <div className="order-1 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-serif text-3xl leading-tight tracking-tight text-[var(--ink)] sm:text-4xl">
                  {momentTitle}
                </p>
                {canManage && onEdit ? (
                  <Button
                    className="h-8 rounded-full px-2.5 text-xs"
                    onClick={() => onEdit(moment)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit title
                  </Button>
                ) : null}
              </div>
              <div className="space-y-1 text-sm text-slate-600">
                <p>{tripTimeLabel} time: {times.tripLabel}</p>
                {times.viewerLabel ? <p>Your time: {times.viewerLabel}</p> : null}
              </div>
            </div>
          </div>
        </div>
        <div className="lg:pt-10">
          <MomentComments
            authorKind={canManage ? "traveler" : "viewer"}
            moment={moment}
            onLoaded={markCommentsReady}
            trip={trip}
          />
        </div>
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
  const momentTitle = moment ? getMomentTitle(moment) : "";

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

  if (!moment) {
    return null;
  }

  return (
    <div
      aria-label="Full-screen moment"
      aria-modal="true"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 text-white sm:p-6"
      onTouchEnd={handleTouchEnd}
      onTouchStart={handleTouchStart}
      role="dialog"
    >
      <button
        aria-label="Dismiss full-screen photo"
        className="absolute inset-0 cursor-zoom-out"
        onClick={onClose}
        type="button"
      />
      <Button
        className="absolute right-3 top-3 z-20 h-11 w-11 bg-white/10 text-white hover:bg-white/20 sm:right-5 sm:top-5"
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
            className="absolute left-3 top-1/2 z-20 h-11 w-11 -translate-y-1/2 bg-white/10 text-white hover:bg-white/20 disabled:bg-white/5 sm:left-5 sm:h-12 sm:w-12"
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
            className="absolute right-3 top-1/2 z-20 h-11 w-11 -translate-y-1/2 bg-white/10 text-white hover:bg-white/20 disabled:bg-white/5 sm:right-5 sm:h-12 sm:w-12"
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
          <div className="absolute left-3 top-3 z-20 rounded-full bg-white/10 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm sm:left-5 sm:top-5">
            {activeIndex + 1} / {moments.length}
          </div>
        </>
      ) : null}
      <div className="relative z-10 flex h-full w-full max-w-[1500px] flex-col justify-center gap-3 lg:flex-row lg:items-center lg:gap-6">
        <div className="relative flex min-h-0 flex-1 items-center justify-center">
          {moment.type === "photo" && moment.imageUrl ? (
            isVideoMoment ? (
              <video
                className="max-h-[calc(100dvh-22rem)] max-w-full bg-black object-contain lg:max-h-[calc(100dvh-3rem)]"
                controls
                playsInline
                preload="metadata"
                src={moment.imageUrl}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={moment.caption ?? moment.placeName ?? "Trip photo"}
                className="max-h-[calc(100dvh-22rem)] max-w-full object-contain lg:max-h-[calc(100dvh-3rem)]"
                src={moment.imageUrl}
              />
            )
          ) : (
            <div className="max-w-2xl rounded-[28px] bg-white/10 p-6 text-lg leading-8 text-white backdrop-blur-sm sm:p-8 sm:text-xl">
              {moment.thoughtText ?? moment.caption ?? "A quiet note from the trip."}
            </div>
          )}
        </div>
        <aside className="max-h-[32dvh] w-full shrink-0 overflow-y-auto rounded-[26px] bg-white/10 p-4 backdrop-blur-sm lg:max-h-[calc(100dvh-3rem)] lg:w-[360px]">
          <div className="space-y-1">
            <p className="whitespace-pre-wrap text-base font-medium leading-7 text-white sm:text-lg">{momentTitle}</p>
            <p className="text-xs text-white/60">Posted {formatPostedAt(moment.postedAt)}</p>
            <p className="text-xs text-white/60">{getMomentLocationLabel(moment)}</p>
          </div>
          <MomentComments
            authorKind={canManage ? "traveler" : "viewer"}
            moment={moment}
            trip={trip}
            variant="viewer"
          />
        </aside>
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
        const image = new Image();
        image.src = moment.imageUrl;
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
        className="h-12 w-12 rounded-full border border-black/5 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.1)] hover:bg-[var(--paper)]"
        disabled={selectedNavigationIndex === 0}
        onClick={() => selectMomentAtIndex(selectedNavigationIndex - 1)}
        size="icon"
        type="button"
        variant="secondary"
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="sr-only">Previous moment</span>
      </Button>
      <span className="min-w-16 text-center text-sm font-medium text-[var(--ink)]">
        {selectedNavigationIndex + 1} / {activeNavigationMoments.length}
      </span>
      <Button
        className="h-12 w-12 rounded-full border border-black/5 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.1)] hover:bg-[var(--paper)]"
        disabled={selectedNavigationIndex === activeNavigationMoments.length - 1}
        onClick={() => selectMomentAtIndex(selectedNavigationIndex + 1)}
        size="icon"
        type="button"
        variant="secondary"
      >
        <ChevronRight className="h-5 w-5" />
        <span className="sr-only">Next moment</span>
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
          "pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 transition duration-300 sm:p-4",
          sidebarHeader && "lg:inset-y-0 lg:left-0 lg:right-auto lg:w-[clamp(24rem,34vw,38rem)] lg:p-0",
          open || sidebarHeader
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0",
        )}
      >
        <div className={cn(
          "pointer-events-auto mx-auto max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] max-w-xl overflow-x-hidden overflow-y-auto overscroll-contain rounded-[30px] border border-black/5 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.18)] sm:max-h-[calc(100dvh_-_2rem_-_env(safe-area-inset-bottom))]",
          sidebarHeader && "lg:relative lg:flex lg:h-full lg:max-h-none lg:max-w-none lg:flex-col lg:overflow-hidden lg:rounded-none lg:border-x-0 lg:border-y-0 lg:border-r",
        )}>
          {sidebarHeader ? (
            <div className="hidden lg:block lg:shrink-0">{sidebarHeader}</div>
          ) : null}
          {activeMoment ? (
            <div className="sticky top-0 z-30 h-0 lg:hidden">
              <Button
                aria-label="Close moment"
                className="absolute right-4 top-4 h-10 w-10 bg-white/95 shadow-[0_10px_24px_rgba(15,23,42,0.1)] hover:bg-[var(--paper)]"
                data-swipe-exempt
                onClick={onClose}
                size="icon"
                type="button"
                variant="secondary"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close moment</span>
              </Button>
            </div>
          ) : null}
          {activeMoment ? (
            <div
              aria-busy={!activeMomentReady}
              className={cn(
                "relative overflow-x-hidden [touch-action:pan-y] lg:translate-x-0 lg:transition-none",
                mobileSlideClass,
                sidebarHeader && "lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden",
              )}
              onTouchCancel={() => {
                mobileSwipeStartRef.current = null;
              }}
              onTouchEnd={handleMobileSwipeEnd}
              onTouchMove={handleMobileSwipeMove}
              onTouchStart={handleMobileSwipeStart}
            >
              <div className={cn(sidebarHeader && "lg:min-h-0 lg:flex-1 lg:overflow-y-auto")}>
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
                <div className="hidden border-t border-black/5 bg-white px-8 py-5 lg:block lg:shrink-0">
                  {momentNavigator}
                </div>
              ) : null}
              <Button
                aria-label="Close moment"
                className="absolute right-5 top-5 z-30 hidden h-10 w-10 bg-white/95 shadow-[0_10px_24px_rgba(15,23,42,0.1)] hover:bg-[var(--paper)] lg:inline-flex"
                data-swipe-exempt
                onClick={onClose}
                size="icon"
                type="button"
                variant="secondary"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close moment</span>
              </Button>
              {!activeMomentReady ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-start justify-center bg-white/95 pt-28 lg:items-center lg:pt-0">
                  <div className="flex items-center gap-2 rounded-full bg-[var(--paper)] px-4 py-2 text-sm text-slate-600">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading moment...
                  </div>
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
