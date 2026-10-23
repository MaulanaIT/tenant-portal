import { reseed } from "./seed";

export default function globalTeardown() {
  reseed();
}
