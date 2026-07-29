import { describe, expect, it } from "vitest";

import builder from "../public/builder.js?raw";
import campaign from "../public/campaign.js?raw";
import common from "../public/common.js?raw";
import manage from "../public/manage.js?raw";
import poster from "../public/poster.js?raw";

describe("client safety and product flow", () => {
  it("strips image metadata through canvas conversion before native form navigation", () => {
    expect(builder).toContain("createImageBitmap");
    expect(builder).toContain('canvas.toBlob(resolve, "image/webp"');
    expect(builder).toContain("DataTransfer");
    expect(builder).toContain("form.requestSubmit()");
    expect(builder).not.toContain("innerHTML");
  });

  it("renders private sightings without HTML injection", () => {
    expect(campaign).toContain(`/api/campaigns/\${campaignId}/sightings`);
    expect(campaign).toContain("目撃情報を送りました");
    expect(manage).toContain("textContent");
    expect(manage).toContain("replaceChildren");
    expect(campaign).not.toContain("innerHTML");
    expect(manage).not.toContain("innerHTML");
  });

  it("keeps the owner token in the fragment and anonymous identity on-device", () => {
    expect(manage).toContain("location.hash.slice(1)");
    expect(manage).toContain('"x-owner-token"');
    expect(common).toContain("localStorage");
    expect(common).not.toContain("document.cookie");
    expect(poster).toContain("window.print()");
  });
});
