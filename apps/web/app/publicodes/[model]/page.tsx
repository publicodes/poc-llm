"use client";

import { Chat } from "../../../components/Chat";

export default function Page({ params }: { params: { model: string } }) {
  //@ts-ignore
  return <Chat model={params.model}></Chat>;
}
