import { contentProxy } from "@/lib/content-proxy";
const handle = contentProxy("news");
export { handle as GET, handle as POST, handle as PUT, handle as DELETE };
