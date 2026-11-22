import { useEffect } from 'react';

interface DocumentMetaOptions {
  title: string;
  description?: string;
  noIndex?: boolean;
  canonicalPath?: string;
}

const SITE_ORIGIN = 'https://innfinder.vercel.app';

export function useDocumentMeta({
  title,
  description,
  noIndex = false,
  canonicalPath,
}: DocumentMetaOptions): void {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let descTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const createdDesc = !descTag;
    const prevDesc = descTag?.getAttribute('content') ?? null;
    if (description) {
      if (!descTag) {
        descTag = document.createElement('meta');
        descTag.name = 'description';
        document.head.appendChild(descTag);
      }
      descTag.content = description;
    }

    let robotsTag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    const createdRobots = !robotsTag;
    const prevRobots = robotsTag?.getAttribute('content') ?? null;
    if (noIndex) {
      if (!robotsTag) {
        robotsTag = document.createElement('meta');
        robotsTag.name = 'robots';
        document.head.appendChild(robotsTag);
      }
      robotsTag.content = 'noindex, nofollow';
    }

    let canonicalTag = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const createdCanonical = !canonicalTag;
    const prevCanonical = canonicalTag?.getAttribute('href') ?? null;
    if (canonicalPath) {
      if (!canonicalTag) {
        canonicalTag = document.createElement('link');
        canonicalTag.rel = 'canonical';
        document.head.appendChild(canonicalTag);
      }
      canonicalTag.href = `${SITE_ORIGIN}${canonicalPath}`;
    }

    return () => {
      document.title = prevTitle;

      if (descTag) {
        if (createdDesc) {
          descTag.remove();
        } else if (prevDesc !== null) {
          descTag.content = prevDesc;
        }
      }

      if (robotsTag) {
        if (createdRobots) {
          robotsTag.remove();
        } else if (prevRobots !== null) {
          robotsTag.content = prevRobots;
        } else {
          robotsTag.removeAttribute('content');
        }
      }

      if (canonicalTag) {
        if (createdCanonical) {
          canonicalTag.remove();
        } else if (prevCanonical !== null) {
          canonicalTag.href = prevCanonical;
        }
      }
    };
  }, [title, description, noIndex, canonicalPath]);
}
