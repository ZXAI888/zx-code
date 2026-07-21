import { useCallback, useEffect, useRef, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Download, ExternalLink, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DOWNLOAD_PAGE_URL } from "@/config/constants";
import { useUpdate } from "@/contexts/UpdateContext";
import { settingsApi } from "@/lib/api";
import { extractErrorMessage } from "@/utils/errorUtils";

interface DownloadProgress {
  downloaded: number;
  total: number | null;
}

export function UpdatePrompt() {
  const { t } = useTranslation();
  const { hasUpdate, updateInfo, isDismissed, dismissUpdate, resetDismiss } =
    useUpdate();
  const [isPortable, setIsPortable] = useState<boolean | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    settingsApi
      .isPortable()
      .then((portable) => {
        if (active) setIsPortable(portable);
      })
      .catch((error) => {
        console.error("[UpdatePrompt] Failed to detect portable mode", error);
        if (active) setIsPortable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      unlistenRef.current?.();
    },
    [],
  );

  const openDownloadPage = useCallback(async () => {
    try {
      await settingsApi.openExternal(DOWNLOAD_PAGE_URL);
      dismissUpdate();
    } catch (error) {
      console.error("[UpdatePrompt] Failed to open download page", error);
      toast.error(t("settings.openDownloadPageFailed"));
    }
  }, [dismissUpdate, t]);

  const installUpdate = useCallback(async () => {
    setIsInstalling(true);
    setProgress(null);
    resetDismiss();

    try {
      unlistenRef.current?.();
      unlistenRef.current = await listen<DownloadProgress>(
        "update-download-progress",
        (event) => setProgress(event.payload),
      );

      const installed = await settingsApi.installUpdateAndRestart();
      if (!installed) {
        dismissUpdate();
        toast.success(t("settings.upToDate"), { closeButton: true });
      }
    } catch (error) {
      console.error("[UpdatePrompt] Update failed", error);
      toast.error(t("settings.updateFailed"), {
        description: extractErrorMessage(error) || undefined,
        closeButton: true,
      });
      try {
        await settingsApi.openExternal(DOWNLOAD_PAGE_URL);
      } catch (openError) {
        console.error(
          "[UpdatePrompt] Failed to open fallback download page",
          openError,
        );
      }
    } finally {
      unlistenRef.current?.();
      unlistenRef.current = null;
      setIsInstalling(false);
    }
  }, [dismissUpdate, resetDismiss, t]);

  const percent =
    progress?.total && progress.total > 0
      ? Math.min(100, Math.round((progress.downloaded / progress.total) * 100))
      : null;
  const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
  const isOpen = Boolean(
    hasUpdate && updateInfo && !isDismissed && isPortable !== null,
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isInstalling) dismissUpdate();
      }}
    >
      <DialogContent className="max-w-md" zIndex="alert">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            {t("settings.updatePromptTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.updatePromptDescription", {
              current: updateInfo?.currentVersion ?? "",
              available: updateInfo?.availableVersion ?? "",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 py-5">
          {updateInfo?.notes && (
            <p className="max-h-32 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {updateInfo.notes}
            </p>
          )}

          {isPortable && (
            <p className="text-sm text-muted-foreground">
              {t("settings.updatePromptPortable")}
            </p>
          )}

          {isInstalling && (
            <div className="space-y-2" aria-live="polite">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full bg-primary transition-[width] duration-200 ${percent === null ? "w-1/3 animate-pulse" : ""}`}
                  style={
                    percent === null ? undefined : { width: `${percent}%` }
                  }
                />
              </div>
              <p className="text-xs tabular-nums text-muted-foreground">
                {progress
                  ? progress.total
                    ? t("settings.updateDownloadProgress", {
                        downloaded: formatMB(progress.downloaded),
                        total: formatMB(progress.total),
                        percent,
                      })
                    : t("settings.updateDownloaded", {
                        downloaded: formatMB(progress.downloaded),
                      })
                  : t("settings.updatePreparing")}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={dismissUpdate}
            disabled={isInstalling}
          >
            {t("settings.updateLater")}
          </Button>
          {isPortable ? (
            <Button type="button" onClick={() => void openDownloadPage()}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("settings.openDownloadPage")}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => void installUpdate()}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              {isInstalling
                ? t("settings.updating")
                : t("settings.installAndRestart")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
