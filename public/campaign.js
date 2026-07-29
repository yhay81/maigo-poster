(() => {
  const shell = document.querySelector("[data-campaign-id]");
  const sightingForm = document.querySelector("[data-sighting-form]");
  if (!shell) return;
  const campaignId = shell.dataset.campaignId || "";
  const campaignName = shell.dataset.campaignName || "迷子ペット";
  const tracker = () => window.maigoPoster;
  tracker()?.track("campaign_viewed", campaignId);

  const seenAt = document.querySelector("[data-seen-at]");
  if (seenAt && !seenAt.value) {
    const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
    seenAt.value = date.toISOString().slice(0, 16);
  }

  document.querySelector("[data-share]")?.addEventListener("click", async (event) => {
    const text = `${campaignName}を探しています。見かけた場所はリンク先から匿名で送れます。`;
    if (navigator.share) {
      await navigator.share({ text, title: document.title, url: location.href });
    } else {
      await navigator.clipboard.writeText(`${text}\n${location.href}`);
      event.currentTarget.textContent = "共有文をコピーしました";
    }
    tracker()?.track("campaign_shared", campaignId);
  });

  document.querySelector("[data-poster]")?.addEventListener("click", () => {
    tracker()?.track("poster_opened", campaignId);
  });

  sightingForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = sightingForm.querySelector('button[type="submit"]');
    const message = document.querySelector("[data-sighting-message]");
    const values = new FormData(sightingForm);
    submit.disabled = true;
    message.textContent = "送信しています…";
    const response = await fetch(`/api/campaigns/${campaignId}/sightings`, {
      body: JSON.stringify({
        area: values.get("area"),
        behavior: values.get("behavior"),
        direction: values.get("direction"),
        seenAt: values.get("seen_at"),
        sessionId: tracker()?.sessionId,
        website: values.get("website"),
      }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    if (response.ok) {
      sightingForm.reset();
      message.textContent = "目撃情報を送りました。ご協力ありがとうございます。";
      submit.textContent = "送信しました";
    } else {
      message.textContent =
        response.status === 429
          ? "短時間の送信上限に達しました。時間をおいてください。"
          : "送信できませんでした。住所や連絡先を含めず、入力を確認してください。";
      message.classList.add("error");
      submit.disabled = false;
    }
  });

  document.querySelector("[data-report]")?.addEventListener("click", async (event) => {
    if (!confirm("虚偽・個人情報・危険な内容として報告しますか？")) return;
    const response = await fetch(`/api/campaigns/${campaignId}/report`, {
      body: JSON.stringify({ reason: "unsafe", sessionId: tracker()?.sessionId }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    event.currentTarget.textContent = response.ok ? "報告しました" : "報告できませんでした";
    event.currentTarget.disabled = true;
  });
})();
