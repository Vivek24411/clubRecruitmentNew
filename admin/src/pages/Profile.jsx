import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AdminContextData } from "../context/AdminContext";
import { Button, Card, EmptyState, Meta, Monogram, Page, PageHeader, Skeleton } from "../components/ui";

export default function Profile() {
  const contextValue = useContext(AdminContextData);
  const navigate = useNavigate();

  async function logout() {
    await contextValue?.signOut();
    navigate("/login");
  }

  if (!contextValue) {
    console.error("AdminContextData is undefined. Make sure the provider is set up correctly.");
    return (
      <Page width="3xl">
        <EmptyState
          title="Context unavailable"
          description="The admin context provider is not set up correctly. Reload the page, or check the app shell."
        />
      </Page>
    );
  }

  const { adminProfile } = contextValue;

  if (!adminProfile) {
    return (
      <Page width="3xl">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-6 h-10 w-1/2" />
        <Skeleton className="mt-10 h-56 w-full" />
      </Page>
    );
  }

  return (
    <Page width="3xl">
      <PageHeader
        eyebrow="Account"
        title="Administrator profile"
        description="The account you are signed in with on this console."
      />

      <Card className="reveal mt-10 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Monogram name={adminProfile.email || "Admin"} size="lg" />
          <div className="min-w-0">
            <h2 className="display text-xl leading-snug">Administrator</h2>
            <p className="mt-1 break-all text-sm text-ink-3">{adminProfile.email}</p>
          </div>
        </div>

        <dl className="mt-7 space-y-4 border-t border-line pt-6">
          <Meta label="Email address" value={adminProfile.email} />
          <Meta label="Role" value="Platform administrator" />
        </dl>

        <div className="mt-7 border-t border-line pt-6">
          <Button variant="danger" onClick={logout}>
            Sign out
          </Button>
          <p className="mt-3 text-xs text-ink-3">
            Signing out ends this session on every device.
          </p>
        </div>
      </Card>
    </Page>
  );
}
