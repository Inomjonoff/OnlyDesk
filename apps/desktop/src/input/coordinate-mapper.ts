import { NormalizedPoint, ViewerScalingMode } from "@nexusdesk/types";

export interface ContainerRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ContentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CoordinateMapper {
  public static calculateContentBounds(
    container: ContainerRect,
    videoWidth: number,
    videoHeight: number,
    scalingMode: ViewerScalingMode = "contain",
  ): ContentBounds {
    if (container.width <= 0 || container.height <= 0 || videoWidth <= 0 || videoHeight <= 0) {
      return { x: 0, y: 0, width: container.width, height: container.height };
    }

    const containerAspect = container.width / container.height;
    const videoAspect = videoWidth / videoHeight;

    switch (scalingMode) {
      case "contain": {
        if (containerAspect > videoAspect) {
          // Pillarbox (black bars on left/right)
          const renderH = container.height;
          const renderW = renderH * videoAspect;
          const renderX = container.left + (container.width - renderW) / 2;
          return { x: renderX, y: container.top, width: renderW, height: renderH };
        } else {
          // Letterbox (black bars on top/bottom)
          const renderW = container.width;
          const renderH = renderW / videoAspect;
          const renderY = container.top + (container.height - renderH) / 2;
          return { x: container.left, y: renderY, width: renderW, height: renderH };
        }
      }

      case "cover": {
        if (containerAspect > videoAspect) {
          const renderW = container.width;
          const renderH = renderW / videoAspect;
          const renderY = container.top + (container.height - renderH) / 2;
          return { x: container.left, y: renderY, width: renderW, height: renderH };
        } else {
          const renderH = container.height;
          const renderW = renderH * videoAspect;
          const renderX = container.left + (container.width - renderW) / 2;
          return { x: renderX, y: container.top, width: renderW, height: renderH };
        }
      }

      case "fit": {
        return {
          x: container.left,
          y: container.top,
          width: container.width,
          height: container.height,
        };
      }

      case "100%": {
        const renderX = container.left + (container.width - videoWidth) / 2;
        const renderY = container.top + (container.height - videoHeight) / 2;
        return { x: renderX, y: renderY, width: videoWidth, height: videoHeight };
      }
    }
  }

  public static normalizePoint(
    clientX: number,
    clientY: number,
    container: ContainerRect,
    videoWidth: number,
    videoHeight: number,
    scalingMode: ViewerScalingMode = "contain",
  ): NormalizedPoint | null {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
      return null;
    }

    const bounds = this.calculateContentBounds(container, videoWidth, videoHeight, scalingMode);

    if (
      clientX < bounds.x ||
      clientX > bounds.x + bounds.width ||
      clientY < bounds.y ||
      clientY > bounds.y + bounds.height
    ) {
      return null; // Outside active video content area (in letterbox/pillarbox)
    }

    const normX = Math.max(0, Math.min(1, (clientX - bounds.x) / bounds.width));
    const normY = Math.max(0, Math.min(1, (clientY - bounds.y) / bounds.height));

    return { x: Number(normX.toFixed(6)), y: Number(normY.toFixed(6)) };
  }

  public static toHostPhysicalPixels(
    point: NormalizedPoint,
    hostWidth: number,
    hostHeight: number,
    dpiScale = 1.0,
  ): { x: number; y: number } {
    const x = Math.round(point.x * hostWidth * dpiScale);
    const y = Math.round(point.y * hostHeight * dpiScale);
    return { x, y };
  }
}
