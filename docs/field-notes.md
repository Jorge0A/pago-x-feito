# Field notes from the real obra

Jorge's observations while using the app day to day. Newest first. Each note says what it changed.

## 18/11/2026 — after M2
- "If I tell Fabiana I don't agree with some prices, the platform would read those suppliers as
  approved?" → yes, it would have. Added line status (cotado / aprovado / recusado / contratado):
  imports land as cotado, only aprovado counts, approving can reject the alternatives.
- Idea: a local "obra folder" on the phone where WhatsApp files are saved (Share → Save to Files), which
  the app reads and pushes into the dashboard; the Claude connector then reads the organized data.
  → v2 native app: expose the app's own folder in iOS Files ("Pago x Feito") and a shared folder on
  Android, both feeding the same inbox; Android may also watch the WhatsApp documents folder with
  consent. Extraction and the connector stay server-side on the obra's private storage.

## 18/11/2026 — after first days on M1
- The app should feel like a dashboard fed by documents, not a form to fill. → v0 milestones reordered:
  Entrada (inbox) with Excel import moved to M2, payments/NF extraction to M3, contracts to M4.
- The engineer (Fabiana) will send an Excel with all suppliers and prices gathered for the
  architects' project. → first real document for the spreadsheet importer; mapping built on it.
- Wants to "choose which WhatsApp chats feed the platform". → not possible with the official API on a
  personal number; v1 keeps forward-to-number and chat export, v2 adds Android notification capture.
- Resumo must hold up with many suppliers. → per-supplier view added to Resumo in M2.
