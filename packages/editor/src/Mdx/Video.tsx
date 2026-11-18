export function Video(props: { src: string; hid?: string; poster?: string }) {
  return (
    <video
      data-mdx-id={props.hid}
      src={props.src}
      poster={props.poster}
      controls
      class="my-6 w-full rounded"
    />
  );
}
