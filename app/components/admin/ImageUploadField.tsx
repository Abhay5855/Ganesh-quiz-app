import { useRef, useState } from "react";
import { Button } from "~/components/ui/Button";
import { uploadQuizImage } from "~/lib/storage";

type ImageUploadFieldProps = {
  label?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
};

export const ImageUploadField = ({
  label = "Image",
  value,
  onChange,
}: ImageUploadFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadQuizImage(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {value ? (
        <div className="flex items-start gap-3">
          <img
            src={value}
            alt=""
            className="h-24 w-24 rounded-lg object-cover"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
            aria-label="Remove image"
          >
            Remove
          </Button>
        </div>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Button
        variant="secondary"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        aria-label="Upload image"
      >
        {uploading ? "Uploading…" : "Upload image"}
      </Button>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
};
