(() => {
  const form = document.querySelector("[data-campaign-form]");
  const photoInput = document.querySelector("[data-photo-input]");
  const photoPreview = document.querySelector("[data-preview-photo]");
  const submitButton = document.querySelector("[data-submit-button]");
  const message = document.querySelector("[data-form-message]");
  if (!form || !photoInput || !submitButton || !message) return;

  const typeLabels = { bird: "鳥", cat: "猫", dog: "犬", other: "その他", small: "小動物" };
  const fields = {
    color: document.querySelector("[data-preview-color-input]"),
    date: document.querySelector("[data-preview-date-input]"),
    features: document.querySelector("[data-preview-features-input]"),
    municipality: document.querySelector("[data-preview-municipality]"),
    name: document.querySelector("[data-preview-name-input]"),
    prefecture: document.querySelector("[data-preview-prefecture]"),
    type: document.querySelector("[data-preview-type-input]"),
  };
  const outputs = {
    color: document.querySelector("[data-preview-color]"),
    date: document.querySelector("[data-preview-date]"),
    features: document.querySelector("[data-preview-features]"),
    name: document.querySelector("[data-preview-name]"),
    place: document.querySelector("[data-preview-place]"),
    type: document.querySelector("[data-preview-type]"),
  };

  const localDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  fields.date.max = localDate;
  if (!fields.date.value) fields.date.value = localDate;

  const formatDate = (value) => {
    if (!value) return "日付";
    return new Intl.DateTimeFormat("ja-JP", {
      day: "numeric",
      month: "long",
      timeZone: "Asia/Tokyo",
    }).format(new Date(`${value}T12:00:00+09:00`));
  };

  const update = () => {
    outputs.type.textContent = typeLabels[fields.type.value] || "ペット";
    outputs.name.textContent = fields.name.value.trim() || "呼び名";
    outputs.color.textContent = fields.color.value.trim() || "色・見た目";
    outputs.date.textContent = formatDate(fields.date.value);
    outputs.place.textContent =
      [fields.prefecture.value, fields.municipality.value.trim()].filter(Boolean).join(" ") ||
      "都道府県 市区町村";
    outputs.features.textContent =
      fields.features.value.trim() || "見分ける特徴がここに表示されます。";
  };
  for (const field of Object.values(fields)) field?.addEventListener("input", update);
  update();

  let previewUrl = "";
  photoInput.addEventListener("change", () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const file = photoInput.files?.[0];
    if (!file || !photoPreview) return;
    previewUrl = URL.createObjectURL(file);
    photoPreview.style.backgroundImage = `url("${previewUrl}")`;
    photoPreview.classList.add("has-photo");
  });

  const canvasBlob = (canvas, quality) =>
    new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));

  const processImage = async (file, maximum, quality) => {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maximum / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#f4f1e9";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return canvasBlob(canvas, quality);
  };

  form.addEventListener("submit", async (event) => {
    if (form.dataset.processed === "true") return;
    event.preventDefault();
    if (!form.reportValidity()) return;
    const file = photoInput.files?.[0];
    if (!file || file.size > 10_000_000 || !file.type.startsWith("image/")) {
      message.textContent = "10MB以下のJPEG・PNG・WebPを選んでください。";
      message.classList.add("error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "写真を安全な形式へ変換中…";
    message.textContent = "写真の位置情報を除いています。";
    message.classList.remove("error");
    try {
      let blob = await processImage(file, 1600, 0.82);
      if (!blob || blob.size > 1_800_000) blob = await processImage(file, 1200, 0.7);
      if (!blob || blob.type !== "image/webp" || blob.size > 1_800_000) {
        throw new Error("image_too_large");
      }
      const processedFile = new File([blob], "pet.webp", { type: "image/webp" });
      const transfer = new DataTransfer();
      transfer.items.add(processedFile);
      photoInput.files = transfer.files;
      form.dataset.processed = "true";
      submitButton.textContent = "捜索ページを作成中…";
      form.requestSubmit();
    } catch {
      submitButton.disabled = false;
      submitButton.textContent = "捜索ページをつくる";
      message.textContent = "写真を変換できませんでした。別の写真を選んでください。";
      message.classList.add("error");
    }
  });
})();
