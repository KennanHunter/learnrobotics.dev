use runtime::parse::extract_class_name;

#[test]
fn finds_simple_public_class() {
    let src = "public class Hello { public static void main(String[] args) {} }";
    assert_eq!(extract_class_name(src).as_deref(), Some("Hello"));
}

#[test]
fn stops_at_opening_brace_without_whitespace() {
    assert_eq!(
        extract_class_name("class Foo{}").as_deref(),
        Some("Foo"),
    );
}

#[test]
fn allows_underscore_and_dollar_identifiers() {
    assert_eq!(
        extract_class_name("class _Weird$Name<T> {}").as_deref(),
        Some("_Weird$Name"),
    );
}

#[test]
fn returns_none_without_class_keyword() {
    assert_eq!(extract_class_name("interface Foo {}"), None);
}

#[test]
fn ignores_class_as_substring() {
    // "classroom" is not the `class` keyword — the function tokenizes by
    // whitespace, so this should not match.
    assert_eq!(extract_class_name("classroom Foo {}"), None);
}
