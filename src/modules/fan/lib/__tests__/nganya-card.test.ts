import { describe, expect, it } from "vitest";
import {
  enrichNganyaImageFields,
  mapNganyaRecordToCardData,
} from "@/modules/fan/lib/nganya-card";

describe("nganya-card", () => {
  it("falls back to profile_photo_url when richer image relations are absent", () => {
    const cardData = mapNganyaRecordToCardData({
      id: "nganya-1",
      name: "Alcapone",
      corridor_name: "Kasarani",
      profile_photo_url: "https://example.com/live.jpg",
    });

    expect(cardData?.imageUrl).toBe("https://example.com/live.jpg");
  });

  it("enriches live rows with full nganya image relations before mapping", () => {
    const fullNganyasById = new Map([
      [
        "nganya-1",
        {
          id: "nganya-1",
          name: "Alcapone",
          corridor_name: "Kasarani",
          nganya_media: [
            { media_url: "https://example.com/gallery.jpg", media_type: "image" },
          ],
        },
      ],
    ]);

    const enriched = enrichNganyaImageFields(
      {
        nganya_id: "nganya-1",
        nganya_name: "Alcapone",
        corridor_name: "Kasarani",
        profile_photo_url: "https://example.com/live.jpg",
      },
      fullNganyasById,
    );

    const cardData = mapNganyaRecordToCardData(enriched);

    expect(cardData?.imageUrl).toBe("https://example.com/gallery.jpg");
  });
});
