// FIRST is a registered trademark; the preferred rendering is italicized
// "FIRST" with the registered mark. Use this component anywhere the brand
// appears in prose so we never miss the italics or the ®.
export function FIRST() {
  return (
    <>
      <i>FIRST</i>
      <span aria-hidden="true">®</span>
    </>
  );
}

export function FirstCopyright(props: { class?: string }) {
  return (
    <p class={props.class}>
      © 2026 For Inspiration and Recognition of Science and Technology (
      <FIRST />
      ). A 501(c)(3) nonprofit organization (EIN# 22-2990908). This course is
      not affiliated with or endorsed by <FIRST />.
    </p>
  );
}
