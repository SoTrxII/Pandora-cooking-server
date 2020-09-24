import { ALLOWED_CONTAINERS, ALLOWED_FORMATS } from "../constants";

export interface CookingOptions {
  format: ALLOWED_FORMATS;
  container: ALLOWED_CONTAINERS;
  dynaudnorm: boolean;
}
