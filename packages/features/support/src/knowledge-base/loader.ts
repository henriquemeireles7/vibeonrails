export interface Article {
  title: string;
  content: string;
}

/**
 * Loads a markdown article from the given path,
 * extracting frontmatter title and body content.
 */
export function loadArticle(_path: string): Article {
  // Stub: will read markdown file and extract frontmatter title
  return {
    title: "",
    content: "",
  };
}
