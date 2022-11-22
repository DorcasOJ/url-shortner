const app = new Vue({
    el: '#app',
    data: {
        url: '',
        slug: '',
        error: '',
        formVissible: true,
        created: null,
    },
    methods: {
        async createUrl() {
            this.error = '';
            const response = await fetch('/url', {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    url: this.url,
                    slug: this.slug || undefined,
                }),
            });
            if(response.ok) {
                const result = await response.json();
                this.formVissible = false;
                this.created =`http://localhost:1337/${result.slug}`;
            } else if (response.status === 429) {
                this.error= 'You are sending too many requests. Try againin 30 seconds';
            } else {
                const result = await response.json();
                this.error ==result.message;
            }
        }
    }
})