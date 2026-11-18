//! Pure parsing helpers shared by the component glue and tests.

pub fn extract_class_name(source: &str) -> Option<String> {
    let mut tokens = source.split_whitespace();
    while let Some(tok) = tokens.next() {
        if tok == "class" {
            let name = tokens.next()?;
            let end = name
                .find(|c: char| !c.is_alphanumeric() && c != '_' && c != '$')
                .unwrap_or(name.len());
            if end > 0 {
                return Some(name[..end].to_string());
            }
        }
    }
    None
}
