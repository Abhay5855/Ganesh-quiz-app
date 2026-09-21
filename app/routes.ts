import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("join/:pin", "routes/join.$pin.tsx"),
  route("play/:gameId", "routes/play.$gameId.tsx"),

  route("admin/login", "routes/admin/login.tsx"),
  layout("routes/admin/layout.tsx", [
    route("admin", "routes/admin/index.tsx"),
    route("admin/quizzes/new", "routes/admin/quizzes.new.tsx"),
    route("admin/quizzes/:quizId", "routes/admin/quizzes.$quizId.tsx"),
  ]),

  layout("routes/host/layout.tsx", [
    route("host", "routes/host/index.tsx"),
    route("host/game/:gameId", "routes/host/game.$gameId.tsx"),
  ]),
] satisfies RouteConfig;
