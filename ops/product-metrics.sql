SELECT
  COUNT(DISTINCT CASE WHEN name = 'visited' THEN session_id END) AS users,
  COUNT(DISTINCT CASE WHEN name = 'campaign_created' THEN session_id END) AS creators,
  COUNT(DISTINCT CASE WHEN name = 'campaign_created' THEN campaign_id END) AS campaigns_created,
  COUNT(DISTINCT CASE WHEN name = 'campaign_viewed' THEN session_id END) AS viewers,
  COUNT(DISTINCT CASE WHEN name = 'poster_printed' THEN session_id END) AS printers,
  COUNT(DISTINCT CASE WHEN name = 'campaign_shared' THEN session_id END) AS sharers,
  COUNT(DISTINCT CASE WHEN name = 'sighting_submitted' THEN session_id END) AS reporters,
  COUNT(DISTINCT CASE WHEN name = 'owner_checked' THEN session_id END) AS owners_checked,
  COUNT(DISTINCT CASE WHEN name = 'campaign_resolved' THEN campaign_id END) AS resolved_campaigns,
  COUNT(DISTINCT CASE WHEN name = 'returned' THEN session_id END) AS returned_users,
  COUNT(DISTINCT CASE WHEN name = 'visited' AND occurred_on >= date('now', '-6 days') THEN session_id END) AS users_7d,
  COUNT(DISTINCT CASE WHEN name = 'campaign_created' AND occurred_on >= date('now', '-6 days') THEN session_id END) AS creators_7d,
  COUNT(DISTINCT CASE WHEN name = 'sighting_submitted' AND occurred_on >= date('now', '-6 days') THEN session_id END) AS reporters_7d,
  (SELECT COUNT(*) FROM campaigns WHERE status = 'active' AND expires_at > unixepoch()) AS active_campaigns,
  (SELECT COUNT(*) FROM sightings) AS sightings,
  (SELECT COUNT(*) FROM reports) AS reports,
  (SELECT COUNT(*) FROM campaigns WHERE status = 'hidden') AS hidden_campaigns
FROM product_events;
