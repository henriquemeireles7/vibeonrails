import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@vibeonrails/web/components";
import { Card } from "@vibeonrails/web/components";
import { useAuth } from "@vibeonrails/web/hooks";

interface Post {
  id: string;
  title: string;
  body: string;
  published: boolean;
  createdAt: string;
}

export function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const accessToken = useAuth((s) => s.accessToken);

  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await fetch("/api/trpc/post.list", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        setPosts(data?.result?.data?.json ?? []);
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, [accessToken]);

  if (loading) return <p className="p-lg">Loading posts...</p>;

  return (
    <div className="stack-lg p-lg" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div className="row-between">
        <h1>Posts</h1>
        <Link to="/dashboard">
          <Button variant="ghost">Back to Dashboard</Button>
        </Link>
      </div>

      {posts.length === 0 ? (
        <p>No posts yet.</p>
      ) : (
        <div className="stack-md">
          {posts.map((post) => (
            <Link key={post.id} to={`/posts/${post.id}`} style={{ textDecoration: "none" }}>
              <Card title={post.title}>
                <p>{post.body.slice(0, 120)}...</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
