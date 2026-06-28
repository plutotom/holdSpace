"use client";

import { use } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  FloorPlanBuilder,
  FloorPlanBuilderMobileFallback,
} from "@/components/floor-plan-builder/FloorPlanBuilder";

interface Props {
  params: Promise<{ floorId: string }>;
}

export default function FloorBuilderPage({ params }: Props) {
  const { floorId } = use(params);
  const { organization } = useOrganization();

  const org = useQuery(
    api.routes.organizations.getByClerkOrgId,
    organization ? { clerkOrgId: organization.id } : "skip"
  );

  if (!org) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <FloorPlanBuilderMobileFallback />
      <FloorPlanBuilder
        floorId={floorId as Id<"floors">}
        organizationId={org._id}
      />
    </div>
  );
}
