use std::collections::HashMap;

use tokio::sync::{oneshot, Mutex};

use crate::shared_types::{ApprovalDecision, ApprovalRequestData};

struct PendingApproval {
  request: ApprovalRequestData,
  sender: oneshot::Sender<ApprovalDecision>,
}

#[derive(Default)]
pub struct ApprovalManager {
  pending: Mutex<HashMap<String, PendingApproval>>,
}

impl ApprovalManager {
  pub async fn wait_for_decision(&self, request: ApprovalRequestData) -> oneshot::Receiver<ApprovalDecision> {
    let request_id = request.id.clone();
    let (sender, receiver) = oneshot::channel();
    let mut pending = self.pending.lock().await;
    pending.insert(
      request.id.clone(),
      PendingApproval {
        request,
        sender,
      },
    );
    eprintln!("[ApprovalManager] wait_for_decision inserted id={} pending_count={}", request_id, pending.len());
    receiver
  }

  pub async fn resolve(&self, id: &str, decision: ApprovalDecision) -> bool {
    let mut pending = self.pending.lock().await;
    let pending_item = pending.remove(id);
    eprintln!("[ApprovalManager] resolve id={} found={} pending_count_after={}", id, pending_item.is_some(), pending.len());
    if let Some(pending) = pending_item {
      let _ = pending.sender.send(decision);
      true
    } else {
      false
    }
  }

  pub async fn has_pending(&self) -> bool {
    !self.pending.lock().await.is_empty()
  }

  pub async fn pending_requests(&self) -> Vec<ApprovalRequestData> {
    self.pending
      .lock().await
      .values()
      .map(|pending| pending.request.clone())
      .collect()
  }

  /// Remove pending approvals older than `max_age_ms`. Returns their IDs for UI cleanup.
  pub async fn cleanup_stale(&self, max_age_ms: u64) -> Vec<String> {
    let mut pending = self.pending.lock().await;
    let now = std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .map(|d| d.as_millis() as u64)
      .unwrap_or(0);

    let stale_ids: Vec<String> = pending
      .iter()
      .filter(|(_, p)| now.saturating_sub(p.request.timestamp) >= max_age_ms)
      .map(|(id, _)| id.clone())
      .collect();

    for id in &stale_ids {
      if let Some(p) = pending.remove(id) {
        let _ = p.sender.send(ApprovalDecision {
          behavior: "allow".into(),
          reason: Some("Auto-resolved: connection timeout".into()),
          updated_input: None,
        });
        eprintln!("[ApprovalManager] auto-resolved stale approval id={}", id);
      }
    }

    stale_ids
  }
}
