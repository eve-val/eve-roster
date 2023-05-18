import { RouteLocationNormalizedLoaded } from "vue-router";

/**
 * Provides typed access the "$route" object in legacy Vue components.
 *
 * Getting access to $route and $router is difficult to do in a type-compatible
 * way, since those types don't appear in basic defineComponent() types.
 */
export const RouteReader = {
  methods: {
    route(): RouteLocationNormalizedLoaded {
      return (this as any)["$route"];
    },
  },
};
