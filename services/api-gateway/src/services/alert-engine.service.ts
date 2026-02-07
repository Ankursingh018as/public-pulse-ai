import { Incident, Alert, Area } from '../models';

export class AlertEngineService {

    async analyzeAndCreateAlerts() {
        try {
            // Get high severity incidents
            const criticalIncidents = await Incident.find({
                severity: { $gte: 8 },
                resolved: false,
                status: { $in: ['pending', 'approved'] }
            }).limit(20);

            for (const incident of criticalIncidents) {
                const existingAlert = await Alert.findOne({
                    related_incident_id: incident._id,
                    active: true
                });

                if (!existingAlert && incident.area_name) {
                    const alert = await Alert.create({
                        title: `Critical ${incident.event_type} Alert`,
                        message: `${incident.description || 'High severity incident'} in ${incident.area_name}`,
                        alert_type: 'incident',
                        severity: 'critical',
                        area_name: incident.area_name,
                        lat: incident.lat,
                        lng: incident.lng,
                        related_incident_id: incident._id,
                        active: true
                    });

                    // Broadcast via WebSocket
                    if ((global as any).io) {
                        (global as any).io.emit('alert:new', {
                            id: alert._id,
                            title: alert.title,
                            message: alert.message,
                            severity: alert.severity,
                            area: alert.area_name
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Error in alert engine:', error);
        }
    }

    async checkAreaRiskScores() {
        try {
            const highRiskAreas = await Area.find({
                risk_score: { $gte: 7 },
                active_incidents: { $gte: 3 }
            }).limit(10);

            for (const area of highRiskAreas) {
                const existingAlert = await Alert.findOne({
                    area_name: area.name,
                    alert_type: 'area',
                    active: true
                });

                if (!existingAlert) {
                    await Alert.create({
                        title: `High Risk Zone Alert`,
                        message: `Area ${area.name} has ${area.active_incidents} active incidents with risk score ${area.risk_score}`,
                        alert_type: 'area',
                        severity: 'high',
                        area_name: area.name,
                        lat: area.lat,
                        lng: area.lng,
                        active: true
                    });
                }
            }
        } catch (error) {
            console.error('Error checking area risk scores:', error);
        }
    }
}

