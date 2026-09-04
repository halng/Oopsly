/*
 *    Copyright 2026 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package com.app.oopsly.api.unit.garden.interfaces.rest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.garden.application.GardenService;
import com.app.oopsly.api.garden.application.vm.*;
import com.app.oopsly.api.garden.domain.PlantSpecies;
import com.app.oopsly.api.garden.domain.SessionMode;
import com.app.oopsly.api.garden.domain.Soundscape;
import com.app.oopsly.api.garden.interfaces.rest.GardenController;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GardenControllerTest {

    @Mock private GardenService gardenService;

    @InjectMocks private GardenController gardenController;

    @Test
    void getGarden_delegatesToService() {
        ApiRes expected = ApiRes.success("ok");
        when(gardenService.getGarden()).thenReturn(expected);

        assertSame(expected, gardenController.getGarden());
        verify(gardenService).getGarden();
    }

    @Test
    void getGarden_propagatesServiceFailures() {
        when(gardenService.getGarden()).thenThrow(new IllegalStateException("boom"));

        assertThrows(IllegalStateException.class, () -> gardenController.getGarden());
    }

    @Test
    void plantSeed_delegatesToService() {
        PlantSeedReq request = new PlantSeedReq(PlantSpecies.CHERRY_BLOSSOM, 1, "Sakura");
        ApiRes expected = ApiRes.created("planted");
        when(gardenService.plantSeed(request)).thenReturn(expected);

        assertSame(expected, gardenController.plantSeed(request));
        verify(gardenService).plantSeed(request);
    }

    @Test
    void plantSeed_propagatesValidationErrors() {
        PlantSeedReq request = new PlantSeedReq(PlantSpecies.CHERRY_BLOSSOM, 8, null);
        when(gardenService.plantSeed(request)).thenThrow(new ValidationException("locked"));

        assertThrows(ValidationException.class, () -> gardenController.plantSeed(request));
    }

    @Test
    void waterTree_delegatesToService() {
        WaterTreeReq request = new WaterTreeReq(UUID.randomUUID());
        ApiRes expected = ApiRes.success("watered");
        when(gardenService.waterTree(request)).thenReturn(expected);

        assertSame(expected, gardenController.waterTree(request));
    }

    @Test
    void waterTree_propagatesNotFound() {
        WaterTreeReq request = new WaterTreeReq(UUID.randomUUID());
        when(gardenService.waterTree(request)).thenThrow(new NotFoundException("missing"));

        assertThrows(NotFoundException.class, () -> gardenController.waterTree(request));
    }

    @Test
    void unlockPlot_delegatesToService() {
        UnlockPlotReq request = new UnlockPlotReq(4);
        ApiRes expected = ApiRes.success("unlocked");
        when(gardenService.unlockPlot(request)).thenReturn(expected);

        assertSame(expected, gardenController.unlockPlot(request));
    }

    @Test
    void completePomodoro_delegatesToService() {
        CompletePomodoroReq request =
                new CompletePomodoroReq(
                        25, 5, SessionMode.FOCUS, Soundscape.STREAM, UUID.randomUUID());
        ApiRes expected = ApiRes.success("done");
        when(gardenService.completePomodoroSession(request)).thenReturn(expected);

        assertSame(expected, gardenController.completePomodoro(request));
        verify(gardenService).completePomodoroSession(request);
    }

    @Test
    void completePomodoro_supportsMinimalPayload() {
        CompletePomodoroReq request = new CompletePomodoroReq(1, null, null, null, null);
        ApiRes expected = ApiRes.success("done");
        when(gardenService.completePomodoroSession(request)).thenReturn(expected);

        assertSame(expected, gardenController.completePomodoro(request));
    }
}
