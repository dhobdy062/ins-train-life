from locust import HttpUser, task, between

class SessionCreationUser(HttpUser):
    wait_time = between(1, 5)

    @task
    def create_training_session(self):
        headers = {
            "Authorization": "Bearer <YOUR_TEST_TOKEN>",
            "Content-Type": "application/json",
        }
        payload = {
            "traineeId": "trainee_123",  # Use a valid test trainee ID
            "productType": "life",
            "difficulty": "D2",
            "selectedObjections": [
                { "text": "How did you get my number?", "rebuttalType": "dont_remember" }
            ]
        }
        self.client.post("/api/trainer/sessions", json=payload, headers=headers)
