#  Copyright (c) 2025 Hal Ng
#  All Rights Reserved.
#
#  This software and associated documentation files (the "Software") are licensed
#  under the MIT License. You may use, copy, modify, merge, publish, distribute,
#  sublicense, and/or sell copies of the Software, subject to the following conditions:
#
#  1. The above copyright notice and this permission notice shall be included
#     in all copies or substantial portions of the Software.
#  2. The Software is provided "as is," without warranty of any kind, express or
#     implied, including but not limited to the warranties of merchantability,
#     fitness for a particular purpose, and noninfringement.
#  3. The authors or copyright holders shall not be liable for any claim, damages,
#     or other liability, whether in an action of contract, tort, or otherwise,
#     arising from, out of, or in connection with the Software.

from locust import HttpUser, task, between


class OsmosisUser(HttpUser):
    # 1. Wait Time: Simulates real human behavior
    # Users won't hammer the server; they wait 1-3 seconds between clicks
    wait_time = between(1, 3)

    # 2. The Task: What the user actually does
    @task
    def check_health_endpoint(self):
        # We use a context manager to enable custom assertions
        with self.client.get("/health", catch_response=True) as response:

            # 3. Validation: It's not enough to just hit it; it must return 200 OK
            if response.status_code == 200:
                response.success()
            else:
                # This marks the request as "Failed" in the report
                response.failure(
                    f"Health check failed with status: {response.status_code}"
                )

    # You can add more tasks with 'weights' to simulate traffic flow
    # @task(3)
    # def view_homepage(self):
    #     self.client.get("/")
