import { createRouter, createWebHistory } from 'vue-router';
import Home from './Home.vue';
import AppDetails from './AppDetails.vue';
import AdminPage from './AdminPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/apps/:id', component: AppDetails },
    { path: '/admin', component: AdminPage },
  ],
});

export default router;
