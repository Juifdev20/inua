import React, { useState, useEffect } from 'react';
import { Card, Button, Select, Checkbox, message, Spin, Modal, Form, Input } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const { Option } = Select;

const Consultations = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [examens, setExamens] = useState([]);
  const [selectedExamens, setSelectedExamens] = useState([]);
  const [terminerModalVisible, setTerminerModalVisible] = useState(false);
  const [diagnostic, setDiagnostic] = useState('');
  const [loadingTerminer, setLoadingTerminer] = useState(false);

  // Charger les consultations du docteur
  useEffect(() => {
    fetchConsultations();
    fetchExamens();
  }, []);

  const fetchConsultations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/doctor/consultations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConsultations(response.data);
    } catch (error) {
      message.error('Erreur lors du chargement des consultations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExamens = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/medical-services', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExamens(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des examens:', error);
    }
  };

  const terminerConsultation = async () => {
    if (!selectedConsultation || selectedExamens.length === 0) {
      message.error('Veuillez sélectionner des examens');
      return;
    }

    try {
      setLoadingTerminer(true);
      const token = localStorage.getItem('token');
      
      // Préparer l'objet pour le backend
      const requestData = {
        diagnostic: diagnostic,
        examensIds: selectedExamens
      };

      const response = await axios.put(
        `/api/v1/doctors/consultations/${selectedConsultation.id}/terminer`,
        requestData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        message.success(`Consultation terminée avec succès! Montant total: ${response.data.montantTotal} FCFA`);
        
        // Réinitialiser le formulaire
        setTerminerModalVisible(false);
        setSelectedConsultation(null);
        setSelectedExamens([]);
        setDiagnostic('');
        
        // Recharger les consultations
        fetchConsultations();
      } else {
        message.error(response.data.error || 'Erreur lors de la terminaison');
      }
    } catch (error) {
      console.error('Erreur lors de la terminaison:', error);
      message.error(error.response?.data?.error || 'Erreur lors de la terminaison de la consultation');
    } finally {
      setLoadingTerminer(false);
    }
  };

  const openTerminerModal = (consultation) => {
    setSelectedConsultation(consultation);
    setDiagnostic(consultation.diagnosis || '');
    setSelectedExamens([]);
    setTerminerModalVisible(true);
  };

  const handleExamenChange = (examensIds) => {
    setSelectedExamens(examensIds);
  };

  return (
    <div style={{ padding: '24px' }}>
      <h1>Mes Consultations</h1>
      
      <Spin spinning={loading}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '16px' }}>
          {consultations.map(consultation => (
            <Card
              key={consultation.id}
              title={`Patient: ${consultation.patientName}`}
              extra={
                <Button 
                  type="primary" 
                  onClick={() => openTerminerModal(consultation)}
                  disabled={consultation.status === 'PENDING_PAYMENT'}
                >
                  {consultation.status === 'PENDING_PAYMENT' ? 'En attente de paiement' : 'Terminer & Envoyer'}
                </Button>
              }
              style={{ marginBottom: '16px' }}
            >
              <p><strong>Date:</strong> {consultation.consultationDate ? new Date(consultation.consultationDate).toLocaleDateString() : 'Date non définie'}</p>
              <p><strong>Motif:</strong> {consultation.motif || consultation.reasonForVisit || 'Non spécifié'}</p>
              <p><strong>Statut:</strong> {consultation.status}</p>
              {consultation.diagnosis && (
                <p><strong>Diagnostic:</strong> {consultation.diagnosis}</p>
              )}
            </Card>
          ))}
        </div>
      </Spin>

      {/* Modal pour terminer la consultation */}
      <Modal
        title="Terminer la consultation"
        open={terminerModalVisible}
        onOk={terminerConsultation}
        onCancel={() => setTerminerModalVisible(false)}
        confirmLoading={loadingTerminer}
        width={600}
      >
        {selectedConsultation && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h4>Patient: {selectedConsultation.patientName}</h4>
              <p><strong>Motif:</strong> {selectedConsultation.motif || selectedConsultation.reasonForVisit || 'Non spécifié'}</p>
            </div>

            <Form.Item label="Diagnostic" required>
              <Input.TextArea
                value={diagnostic}
                onChange={(e) => setDiagnostic(e.target.value)}
                placeholder="Entrez le diagnostic..."
                rows={4}
              />
            </Form.Item>

            <Form.Item label="Examens prescrits" required>
              <Select
                mode="multiple"
                placeholder="Sélectionnez les examens..."
                value={selectedExamens}
                onChange={handleExamenChange}
                style={{ width: '100%' }}
              >
                {examens.map(examen => (
                  <Option key={examen.id} value={examen.id}>
                    {examen.nom} - {examen.prix} FCFA
                  </Option>
                ))}
              </Select>
            </Form.Item>

            {selectedExamens.length > 0 && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                <h4>Examens sélectionnés:</h4>
                {examens
                  .filter(examen => selectedExamens.includes(examen.id))
                  .map(examen => (
                    <div key={examen.id}>
                      • {examen.nom} - {examen.prix} FCFA
                    </div>
                  ))}
                <hr style={{ margin: '8px 0' }} />
                <strong>Total estimé: {
                  examens
                    .filter(examen => selectedExamens.includes(examen.id))
                    .reduce((total, examen) => total + (examen.prix || 0), 0)
                } FCFA</strong>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Consultations;
