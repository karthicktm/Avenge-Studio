import { parfymBannerTemplate, type WorkflowTemplate } from "./parfym-banner";
import { bannerCampaignTemplate } from "./banner-campaign";

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  parfymBannerTemplate,
  bannerCampaignTemplate,
];

export type { WorkflowTemplate };
