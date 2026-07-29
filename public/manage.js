(() => {
  const shell = document.querySelector("[data-campaign-id]");
  if (!shell) return;
  const campaignId = shell.dataset.campaignId || "";
  const token = location.hash.slice(1);
  const message = document.querySelector("[data-manage-message]");
  const statusLabel = document.querySelector("[data-status-label]");
  const sightings = document.querySelector("[data-sightings]");

  const setMessage = (text, error = false) => {
    message.textContent = text;
    message.classList.toggle("error", error);
  };

  const validToken = /^[0-9a-f]{64}$/i.test(token);
  if (!validToken) {
    setMessage("管理鍵がURLにありません。作成時の管理URLを開いてください。", true);
    for (const button of document.querySelectorAll(
      "[data-resolve], [data-reopen], [data-delete], [data-refresh]",
    )) {
      button.disabled = true;
    }
  }

  document.querySelector("[data-copy-url]")?.addEventListener("click", async (event) => {
    const url = document.querySelector("[data-share-url]")?.textContent || "";
    await navigator.clipboard.writeText(
      `迷子ペットを探しています。見かけた場所はリンク先から匿名で送れます。\n${url}`,
    );
    event.currentTarget.textContent = "共有文をコピーしました";
    window.maigoPoster?.track("campaign_shared", campaignId);
  });

  const changeStatus = async (status) => {
    const response = await fetch(`/api/campaigns/${campaignId}/status`, {
      body: JSON.stringify({ status }),
      headers: { "content-type": "application/json", "x-owner-token": token },
      method: "POST",
    });
    if (!response.ok) {
      setMessage("状態を変更できませんでした。公開期限を確認してください。", true);
      return;
    }
    statusLabel.textContent = status === "active" ? "捜索中" : "帰宅・保護済み";
    setMessage(
      status === "active"
        ? "捜索ページをもう一度公開しました。"
        : "帰宅・保護済みとして、目撃情報の受付を終了しました。",
    );
  };

  document.querySelector("[data-resolve]")?.addEventListener("click", () => {
    if (confirm("帰宅・保護済みにして、目撃情報の受付を終了しますか？")) {
      void changeStatus("resolved");
    }
  });
  document.querySelector("[data-reopen]")?.addEventListener("click", () => changeStatus("active"));

  document.querySelector("[data-delete]")?.addEventListener("click", async () => {
    if (!confirm("写真・目撃情報・捜索ページを完全に削除します。元に戻せません。")) return;
    const response = await fetch(`/api/campaigns/${campaignId}`, {
      headers: { "x-owner-token": token },
      method: "DELETE",
    });
    if (!response.ok) {
      setMessage("削除できませんでした。管理URLを確認してください。", true);
      return;
    }
    location.assign("/?deleted=1");
  });

  const renderSightings = (items) => {
    sightings.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty-message";
      empty.textContent = "目撃情報はまだ届いていません。";
      sightings.append(empty);
      return;
    }
    for (const item of items) {
      const card = document.createElement("article");
      const time = document.createElement("time");
      time.textContent = new Intl.DateTimeFormat("ja-JP", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(`${item.seen_at}:00+09:00`));
      const area = document.createElement("strong");
      area.textContent = item.area;
      card.append(time, area);
      if (item.direction) {
        const direction = document.createElement("p");
        direction.textContent = `移動：${item.direction}`;
        card.append(direction);
      }
      if (item.behavior) {
        const behavior = document.createElement("p");
        behavior.textContent = `様子：${item.behavior}`;
        card.append(behavior);
      }
      sightings.append(card);
    }
  };

  const loadSightings = async () => {
    if (!validToken) return;
    sightings.textContent = "読み込み中…";
    const response = await fetch(`/api/campaigns/${campaignId}/sightings`, {
      headers: { "x-owner-token": token },
    });
    if (!response.ok) {
      sightings.textContent = "管理鍵を確認できませんでした。";
      return;
    }
    const body = await response.json();
    renderSightings(body.sightings || []);
  };
  document.querySelector("[data-refresh]")?.addEventListener("click", loadSightings);
  void loadSightings();

  const checklistKey = `maigo-poster-checklist-${campaignId}`;
  let checked = {};
  try {
    checked = JSON.parse(localStorage.getItem(checklistKey) || "{}");
  } catch {
    checked = {};
  }
  for (const input of document.querySelectorAll("[data-checklist]")) {
    input.checked = Boolean(checked[input.dataset.checklist]);
    input.addEventListener("change", () => {
      checked[input.dataset.checklist] = input.checked;
      try {
        localStorage.setItem(checklistKey, JSON.stringify(checked));
      } catch {
        // Checklist persistence is optional.
      }
    });
  }
})();
