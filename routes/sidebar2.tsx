/**
 * Sidebar routes
 */

interface IRoute {
  path?: string;
  icon?: string;
  name: string;
  routes?: IRoute[];
  checkActive?: (pathname: string, route: IRoute) => boolean;
  exact?: boolean;
}

export function routeIsActive(pathname: string, route: IRoute): boolean {
  if (route.checkActive) {
    return route.checkActive(pathname, route);
  }

  if (!route.path) return false;

  if (route.exact) {
    return pathname === route.path;
  }

  return pathname === route.path || pathname.startsWith(`${route.path}/`);
}

const routes: IRoute[] = [
  {
    path: "/ncsr/dashboard",
    icon: "HomeIcon",
    name: "Dashboard",
    exact: true,
  },
  {
    path: "/ncsr/clients",
    name: "Clients",
  },
  {
    path: "/ncsr/all-visits",
    icon: "FormsIcon",
    name: "Visits",
  },

   {
    path: "/ncsr/screenings",
    icon: "FormsIcon",
    name: "Screenings",
  },

   {
    path: "/ncsr/outcomes",
    icon: "FormsIcon",
    name: "Outcomes",
  },
  // {
  //   icon: "PagesIcon",
  //   name: "Clients",
  //   routes: [
  //     {
  //       path: "/ncsr/clients",
  //       name: "Clients",
  //     },
  //     {
  //       path: "/ncsr/add-client",
  //       name: "Create client",
  //     },
  //   ],
  // },
];

export type { IRoute };
export default routes;
