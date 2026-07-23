import { API_BASE } from "../api/client";

export default function ItemPhotos({ urls, size = "h-12 w-12" }) {
  if (!urls || urls.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {urls.map((url) => (
        <a
          key={url}
          href={`${API_BASE}${url}`}
          target="_blank"
          rel="noreferrer"
          className={`block ${size} shrink-0 overflow-hidden rounded border border-ink/10`}
        >
          <img src={`${API_BASE}${url}`} alt="Item" className="h-full w-full object-cover" />
        </a>
      ))}
    </div>
  );
}
