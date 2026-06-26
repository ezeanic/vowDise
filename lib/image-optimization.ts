const targetImageBytes = 500 * 1024;
const maxImageDimension = 1800;
const minImageDimension = 900;
const qualitySteps = [0.82, 0.76, 0.7, 0.64, 0.58];

type ImageDimensions = {
  width: number;
  height: number;
};

const browserDecodableImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

function isBrowserDecodableImage(file: File) {
  const fileName = file.name.toLowerCase();
  return (
    browserDecodableImageTypes.has(file.type) ||
    /\.(jpe?g|png|webp|gif|svg)$/.test(fileName)
  );
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else
          reject(new Error("Unable to optimize image. Try a different file."));
      },
      type,
      quality,
    );
  });
}

function getTargetDimensions(
  { width, height }: ImageDimensions,
  maxDimension: number,
) {
  const largestDimension = Math.max(width, height);
  if (largestDimension <= maxDimension) return { width, height };

  const scale = maxDimension / largestDimension;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function drawImageToCanvas(
  image: CanvasImageSource,
  dimensions: ImageDimensions,
) {
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare image optimization.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, dimensions.width, dimensions.height);
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  return canvas;
}

async function loadImage(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();

    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    throw new Error(
      `${file.name} could not be decoded. Use a JPG, PNG, or WebP image.`,
    );
  }
}

function optimizedFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "vendor-image";
  return `${baseName}.webp`;
}

export async function optimizeVendorImageFile(file: File) {
  if (!isBrowserDecodableImage(file)) {
    throw new Error(
      `${file.name} is not a supported upload format. Use JPG, PNG, WebP, GIF, or SVG.`,
    );
  }

  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;

  const loadedImage = await loadImage(file);

  try {
    let dimensions = getTargetDimensions(loadedImage, maxImageDimension);
    let bestBlob: Blob | null = null;

    while (Math.max(dimensions.width, dimensions.height) >= minImageDimension) {
      const canvas = drawImageToCanvas(loadedImage.image, dimensions);

      for (const quality of qualitySteps) {
        const blob = await canvasToBlob(canvas, "image/webp", quality);
        bestBlob = blob;
        if (blob.size <= targetImageBytes) {
          return new File([blob], optimizedFileName(file.name), {
            type: "image/webp",
            lastModified: Date.now(),
          });
        }
      }

      const scale = Math.max(
        0.78,
        Math.sqrt(targetImageBytes / (bestBlob?.size || targetImageBytes)) *
          0.94,
      );
      dimensions = {
        width: Math.round(dimensions.width * scale),
        height: Math.round(dimensions.height * scale),
      };
    }

    if (!bestBlob) return file;

    return new File([bestBlob], optimizedFileName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    loadedImage.cleanup();
  }
}
