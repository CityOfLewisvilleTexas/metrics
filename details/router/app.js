"use strict";

// route components
const Foo = { template: '<div>foo</div' }
const Bar = { template: '<div>bar</div>' }

//define routes
const routes = [
    { path: '/foo', component: Foo },
    { path: '/bar', component: Bar }
]

// router instance
const router = new VueRouter({
    routes // short for `routes: routes`
})

const app = new Vue({
    router,
    methods: {
        help: function() {
            console.log('help')
        }
    }
}).$mount('#app')