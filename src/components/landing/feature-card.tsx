import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/infra/utils";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClassName?: string;
  iconBgClassName?: string;
}

export function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  iconClassName,
  iconBgClassName 
}: FeatureCardProps) {
  return (
    <div className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
      <div className={cn("mb-4 inline-block rounded-lg p-3", iconBgClassName, iconClassName)}>
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  );
}
