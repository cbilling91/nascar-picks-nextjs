"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Plus, Copy, Check } from "lucide-react";
import { generateAuthToken } from "@/lib/auth-token";

interface User {
  id: string;
  display_name: string;
  phone_number: string | null;
  text_notifications: boolean;
  is_admin: boolean;
  auth_token: string;
  created_at: string;
}

export default function UsersPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ display_name: "", phone_number: "", text_notifications: false, is_admin: false });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const copyToClipboard = (token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, display_name, phone_number, text_notifications, is_admin, auth_token, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading profiles:", error);
        setUsers([]);
        return;
      }

      setUsers((profiles || []).map(p => ({
        id: p.id,
        display_name: p.display_name,
        phone_number: p.phone_number || null,
        text_notifications: p.text_notifications || false,
        is_admin: p.is_admin,
        auth_token: p.auth_token || "",
        created_at: p.created_at,
      })));
    } catch (error) {
      console.error("Error loading users:", error);
    }
    setLoading(false);
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!formData.display_name.trim()) {
      setError("Display name is required");
      return;
    }

    try {
      const newId = editingId || crypto.randomUUID();
      const authToken = editingId ? undefined : generateAuthToken();

      const payload: any = {
        id: newId,
        display_name: formData.display_name,
        phone_number: formData.phone_number || null,
        text_notifications: formData.text_notifications,
        is_admin: formData.is_admin,
        created_at: new Date().toISOString(),
      };

      if (authToken) {
        payload.auth_token = authToken;
      }

      if (editingId) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update(payload)
          .eq("id", editingId);

        if (updateError) {
          setError(`Failed to update player: ${updateError.message}`);
        } else {
          setMessage(`Player "${formData.display_name}" updated successfully!`);
          setEditingId(null);
          setFormData({ display_name: "", phone_number: "", text_notifications: false, is_admin: false });
          setShowForm(false);
          loadUsers();
          setTimeout(() => setMessage(""), 3000);
        }
      } else {
        const { error: insertError } = await supabase
          .from("profiles")
          .insert(payload);

        if (insertError) {
          setError(`Failed to add player: ${insertError.message}`);
        } else {
          setMessage(`Player "${formData.display_name}" added successfully!`);
          setFormData({ display_name: "", phone_number: "", text_notifications: false, is_admin: false });
          setShowForm(false);
          loadUsers();
          setTimeout(() => setMessage(""), 3000);
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  const handleEditPlayer = (user: User) => {
    setEditingId(user.id);
    setFormData({
      display_name: user.display_name,
      phone_number: user.phone_number || "",
      text_notifications: user.text_notifications,
      is_admin: user.is_admin,
    });
    setShowForm(true);
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_admin: !currentStatus })
        .eq("id", userId);

      if (error) {
        alert("Failed to update admin status");
      } else {
        loadUsers();
      }
    } catch (error) {
      console.error("Error updating admin status:", error);
      alert("Failed to update admin status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this player? This cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) {
        alert("Failed to delete player");
      } else {
        loadUsers();
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete player");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Players</h1>
          <p className="text-muted-foreground">Manage competition players</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Player
        </Button>
      </div>

      {/* Add/Edit Player Form */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Player" : "Add New Player"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddPlayer} className="space-y-4">
              <div>
                <Label htmlFor="display_name">Name</Label>
                <Input
                  id="display_name"
                  type="text"
                  placeholder="Player name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  placeholder="5555555555"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="text_notifications"
                  checked={formData.text_notifications}
                  onChange={(e) => setFormData({ ...formData, text_notifications: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="text_notifications" className="cursor-pointer">
                  Text Notifications
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={formData.is_admin}
                  onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_admin" className="cursor-pointer">
                  Admin
                </Label>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-green-600">{message}</p>}

              <div className="flex gap-2">
                <Button type="submit" variant="default">
                  {editingId ? "Update Player" : "Add Player"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ display_name: "", phone_number: "", text_notifications: false, is_admin: false });
                    setError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Players List */}
      <Card>
        <CardHeader>
          <CardTitle>Players ({users.length})</CardTitle>
          <CardDescription>All registered players and admins</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Loading players...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No players found. Click "Add Player" to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{user.display_name}</h3>
                        <p className="text-sm text-muted-foreground">{user.phone_number || "No phone"}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEditPlayer(user)}
                          variant="outline"
                          size="sm"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteUser(user.id)}
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-muted-foreground">Text Notifications:</span>
                      <span>{user.text_notifications ? "✓" : "—"}</span>
                      <span className="text-xs text-muted-foreground ml-4">Admin:</span>
                      <span>{user.is_admin ? "✓" : "—"}</span>
                    </div>

                    <div className="bg-muted p-3 rounded space-y-2">
                      <p className="text-xs font-semibold">Auth Token:</p>
                      <div className="flex gap-2 items-center">
                        <code className="text-xs bg-background p-2 rounded flex-1 overflow-x-auto">
                          {user.auth_token}
                        </code>
                        <Button
                          onClick={() => copyToClipboard(user.auth_token)}
                          variant="ghost"
                          size="sm"
                          className="flex-shrink-0"
                        >
                          {copiedToken === user.auth_token ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Share this token in text messages as: {window.location.origin}?token={user.auth_token}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
