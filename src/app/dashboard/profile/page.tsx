import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getUserProfile } from "@/app/actions";
import ProfileContent from "@/app/dashboard/profile/profile-content";
export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/api/auth/signin");
  }

  const profile = await getUserProfile();

  return (
      <div className="container max-w-4xl py-6 mx-auto px-6">
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Account Settings
            </h1>
            <p className="mt-2 text-muted-foreground">
            Manage your profile, AI configuration, and API tokens.
            </p>
        </header>

        <div className="space-y-10">
          {/* User Info Header */}
          <section className="p-6 rounded-xl border bg-card flex items-center gap-6">
                {profile.image ? (
                    <img
                        src={profile.image}
                        alt={profile.name || 'User'}
                        className="h-20 w-20 rounded-full object-cover shadow-md"
                    />
                ) : (
                    <div className="h-20 w-20 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-md">
                        {profile.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                )}
                <div>
                    <h2 className="text-xl font-bold">{profile.name || 'Anonymous User'}</h2>
                    <p className="text-muted-foreground">{profile.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                         <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                             {profile.credits} Credits Available
                         </span>
                    </div>
                </div>
          </section>

          {/* Main Content */}
          <section>
              <ProfileContent
                initialCredits={profile.credits}
                initialTokens={profile.tokens}
                initialName={profile.name}
                initialImage={profile.image}
                initialApiKey={profile.openaiApiKey}
                initialBaseUrl={profile.openaiBaseUrl}
                initialModel={profile.openaiModel}
                initialStorage={profile.storage}
                initialUsername={profile.username}
               />
          </section>
        </div>
      </div>
  );
}