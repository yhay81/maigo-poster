(() => {
  const shell = document.querySelector("[data-campaign-id]");
  const campaignId = shell?.dataset.campaignId || "";
  window.maigoPoster?.track("poster_opened", campaignId);
  document.querySelector("[data-print]")?.addEventListener("click", () => {
    window.maigoPoster?.track("poster_printed", campaignId);
    window.print();
  });
})();
