use crate::diagnostics::now_ms;
use crate::models::{Suggestion, SuggestionKind, SuggestionPreferences, TranscriptSegment};
use uuid::Uuid;

pub fn build_suggestions(
    transcript: &[TranscriptSegment],
    preferences: &SuggestionPreferences,
) -> Vec<Suggestion> {
    let context = transcript
        .iter()
        .rev()
        .take(4)
        .map(|segment| segment.text.as_str())
        .collect::<Vec<_>>()
        .join(" ");

    let mut suggestions = Vec::new();
    for kind in preferences.enabled_kinds.iter().take(4) {
        let text = match kind {
            SuggestionKind::DirectResponse => direct_response(&context, preferences),
            SuggestionKind::ClarifyingQuestion => clarifying_question(&context, preferences),
            SuggestionKind::Summary => summary(&context),
            SuggestionKind::NextAction => next_action(&context),
        };
        suggestions.push(Suggestion {
            id: Uuid::new_v4().to_string(),
            kind: kind.clone(),
            text,
            confidence: if context.trim().is_empty() {
                0.48
            } else {
                0.74
            },
            created_at_ms: now_ms(),
        });
    }
    suggestions.truncate(3);
    suggestions
}

fn direct_response(context: &str, preferences: &SuggestionPreferences) -> String {
    if context.trim().is_empty() {
        return "Posso acompanhar esse ponto e responder quando houver uma decisao clara."
            .to_string();
    }
    format!(
        "Eu responderia de forma {}: entendi o ponto; posso confirmar o impacto e propor o proximo passo.",
        preferences.tone
    )
}

fn clarifying_question(context: &str, preferences: &SuggestionPreferences) -> String {
    if context.to_ascii_lowercase().contains("prazo") {
        return "Qual prazo e criterio de sucesso devemos considerar para essa decisao?"
            .to_string();
    }
    format!(
        "Voce quer que eu valide isso pelo contexto atual em {} ou aprofunde algum detalhe?",
        preferences.language
    )
}

fn summary(context: &str) -> String {
    if context.trim().is_empty() {
        "Resumo atual: ainda nao ha fala suficiente para consolidar o contexto.".to_string()
    } else {
        "Resumo atual: a conversa trouxe um ponto que precisa ser confirmado antes de assumir compromisso.".to_string()
    }
}

fn next_action(context: &str) -> String {
    if context.to_ascii_lowercase().contains("problema") {
        "Proxima acao: reconhecer o problema, pedir um exemplo concreto e propor uma verificacao rapida.".to_string()
    } else {
        "Proxima acao: confirmar entendimento e sugerir uma decisao ou dono para continuidade."
            .to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::SuggestionPreferences;

    #[test]
    fn limits_suggestions_to_three() {
        let preferences = SuggestionPreferences::default();
        let suggestions = build_suggestions(&[], &preferences);
        assert!(suggestions.len() <= 3);
    }
}
