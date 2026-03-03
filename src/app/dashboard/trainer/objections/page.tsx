import { auth } from "@clerk/nextjs/server";
import { getOrgTrainerObjectionConfig } from "@/lib/convex";
import {
  cloneObjectionLibrary,
  DEFAULT_REBUTTAL_GUIDES,
  normalizeObjectionLibrary,
  normalizeRebuttalGuides,
} from "@/lib/trainer-objections";
import ObjectionsEditor from "./ObjectionsEditor";

export default async function ObjectionsPage() {
  const { orgId } = await auth();
  if (!orgId) {
    return null;
  }

  const config = await getOrgTrainerObjectionConfig({ orgId }).catch(() => null);
  const initialLibrary = normalizeObjectionLibrary(config?.objectionLibrary ?? cloneObjectionLibrary());
  const initialGuides = normalizeRebuttalGuides(config?.rebuttalGuides ?? DEFAULT_REBUTTAL_GUIDES);

  return <ObjectionsEditor initialLibrary={initialLibrary} initialGuides={initialGuides} />;
}
