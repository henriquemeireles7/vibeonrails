import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@vibeonrails/web/components";
import { Card } from "@vibeonrails/web/components";
import { useAuth } from "@vibeonrails/web/hooks";

interface Post {
  id: string;
  title: string;
  body: string;
  published: boolean;
  createdAt: string;
  authorId: string;
}

export function PostPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const accessToken = useAuth((s) => s.accessToken);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/trpc/post.getById?input=${encodeURIComponent(JSON.stringify({ json: id }))}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        setPost(data?.result?.data?.json ?? null);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchPost();
  }, [id, accessToken]);

  if (loading) return <p className="p-lg">Loading...</p>;
  if (!post) return <p className="p-lg">Post not found.</p>;

  return (
    <div className="stack-lg p-lg" style={{ maxWidth: 800, margin: "0 auto" }}>
      <Link to="/posts">
        <Button variant="ghost">Back to Posts</Button>
      </Link>

      <Card title={post.title}>
        <div className="stack-md">
          <p>{post.body}</p>
          <p className="help-text">
            Created: {new Date(post.createdAt).toLocaleDateString()} |
            Status: {post.published ? "Published" : "Draft"}
          </p>
        </div>
      </Card>
    </div>
  );
}
