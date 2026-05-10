import React, { useState, useEffect } from 'react';
import { Card, Button, Table, message, Spin, Input, Modal, Form, Tag } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const { TextArea } = Input;

const ExamenLabo = () => {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState(null);
  const [montantSaisi, setMontantSaisi] = useState('');
  const [montantTotal, setMontantTotal] = useState(0);
  const [loadingPaiement, setLoadingPaiement] = useState(false);
  const [envoyerModalVisible, setEnvoyerModalVisible] = useState(false);

  // Charger les consultations en attente de paiement
  useEffect(() => {
    fetchConsultationsEnAttente();
  }, []);

  const fetchConsultationsEnAttente = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/reception/consultations?status=ATTENTE_PAIEMENT_LABO', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setConsultations(response.data.content);
      } else {
        message.error(response.data.error || 'Erreur lors du chargement');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des consultations:', error);
      message.error('Erreur lors du chargement des consultations en attente');
    } finally {
      setLoading(false);
    }
  };

  const openEnvoyerModal = (consultation) => {
    setSelectedConsultation(consultation);
    setMontantTotal(consultation.montantTotal || 0);
    setMontantSaisi('');
    setEnvoyerModalVisible(true);
  };

  const envoyerAuLabo = async () => {
    if (!selectedConsultation) return;

    if (!montantSaisi || parseFloat(montantSaisi) <= 0) {
      message.error('Veuillez saisir un montant valide');
      return;
    }

    if (parseFloat(montantSaisi) !== montantTotal) {
      message.error(`Le montant saisi (${montantSaisi} FCFA) ne correspond pas au montant total (${montantTotal} FCFA)`);
      return;
    }

    try {
      setLoadingPaiement(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.put(
        `/api/v1/reception/consultations/${selectedConsultation.id}/pay-lab`,
        {
          examAmountPaid: parseFloat(montantSaisi),
          status: "labo"
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        message.success('Paiement traité avec succès! Consultation envoyée au laboratoire');
        setEnvoyerModalVisible(false);
        setSelectedConsultation(null);
        setMontantSaisi('');
        
        // Recharger la liste
        fetchConsultationsEnAttente();
      } else {
        message.error(response.data.error || 'Erreur lors du traitement du paiement');
      }
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      message.error(error.response?.data?.error || 'Erreur lors du traitement du paiement');
    } finally {
      setLoadingPaiement(false);
    }
  };

  // Logique de verrou : le bouton est disabled si le montant saisi est différent du montant total
  const boutonEnvoyerDisabled = !montantSaisi || parseFloat(montantSaisi) !== montantTotal;

  const columns = [
    {
      title: 'Patient',
      dataIndex: 'patientName',
      key: 'patientName',
      render: (text, record) => (
        <div>
          <strong>{text}</strong>
          {record.patientPhoto && (
            <img 
              src={record.patientPhoto} 
              alt={text}
              style={{ width: '40px', height: '40px', borderRadius: '50%', marginLeft: '8px' }}
            />
          )}
        </div>
      ),
    },
    {
      title: 'Examens',
      dataIndex: 'exams',
      key: 'exams',
      render: (exams) => (
        <div>
          {exams && exams.length > 0 ? (
            exams.map((exam, index) => (
              <Tag key={index} color="blue" style={{ marginBottom: '4px' }}>
                {exam.service?.nom || `Examen ${exam.serviceId}`}
              </Tag>
            ))
          ) : (
            <Tag color="default">Aucun examen</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Montant Total',
      dataIndex: 'montantTotal',
      key: 'montantTotal',
      render: (montant) => (
        <strong style={{ color: '#1890ff' }}>
          {montant ? `${montant} FCFA` : '0 FCFA'}
        </strong>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          type="primary"
          onClick={() => openEnvoyerModal(record)}
          style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
        >
          Traiter Paiement
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1>Examens de Laboratoire - Paiements en Attente</h1>
      
      <Spin spinning={loading}>
        {consultations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <h3>Aucun dossier en attente</h3>
            <p>Toutes les consultations ont été traitées</p>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={consultations}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            style={{ marginTop: '16px' }}
          />
        )}
      </Spin>

      {/* Modal pour traiter le paiement */}
      <Modal
        title="Traiter le paiement et envoyer au laboratoire"
        open={envoyerModalVisible}
        onOk={envoyerAuLabo}
        onCancel={() => setEnvoyerModalVisible(false)}
        confirmLoading={loadingPaiement}
        width={600}
        okText="Envoyer au Labo"
        cancelText="Annuler"
        okButtonProps={{ 
          disabled: boutonEnvoyerDisabled,
          style: { backgroundColor: boutonEnvoyerDisabled ? '#d9d9d9' : '#52c41a' }
        }}
      >
        {selectedConsultation && (
          <div>
            <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <h4>Informations de la consultation</h4>
              <p><strong>Patient:</strong> {selectedConsultation.patientName}</p>
              <p><strong>Date:</strong> {new Date(selectedConsultation.createdAt).toLocaleDateString()}</p>
              <p><strong>Examens:</strong></p>
              <div style={{ marginLeft: '16px' }}>
                {selectedConsultation.exams && selectedConsultation.exams.map((exam, index) => (
                  <div key={index}>
                    • {exam.service?.nom || `Examen ${exam.serviceId}`}
                  </div>
                ))}
              </div>
            </div>

            <Form.Item 
              label="Montant total à payer" 
              style={{ marginBottom: '8px' }}
            >
              <Input
                value={`${montantTotal} FCFA`}
                disabled
                style={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}
              />
            </Form.Item>

            <Form.Item 
              label="Montant saisi par le réceptionniste" 
              required
              validateStatus={montantSaisi && parseFloat(montantSaisi) !== montantTotal ? 'error' : ''}
              help={montantSaisi && parseFloat(montantSaisi) !== montantTotal ? 'Le montant doit correspondre au montant total' : ''}
            >
              <Input
                type="number"
                value={montantSaisi}
                onChange={(e) => setMontantSaisi(e.target.value)}
                placeholder="Entrez le montant payé..."
                addonAfter="FCFA"
                style={{ backgroundColor: parseFloat(montantSaisi) === montantTotal ? '#f6ffed' : 'white' }}
              />
            </Form.Item>

            {montantSaisi && parseFloat(montantSaisi) !== montantTotal && (
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#fff2f0', 
                border: '1px solid #ffccc7',
                borderRadius: '4px',
                marginBottom: '16px'
              }}>
                <p style={{ color: '#ff4d4f', margin: 0 }}>
                  ⚠️ Le montant saisi ne correspond pas au montant total!
                </p>
                <p style={{ color: '#ff4d4f', margin: 0 }}>
                  Différence: {Math.abs(parseFloat(montantSaisi) - montantTotal)} FCFA
                </p>
              </div>
            )}

            {montantSaisi && parseFloat(montantSaisi) === montantTotal && (
              <div style={{ 
                padding: '8px', 
                backgroundColor: '#f6ffed', 
                border: '1px solid #b7eb8f',
                borderRadius: '4px',
                marginBottom: '16px'
              }}>
                <p style={{ color: '#52c41a', margin: 0 }}>
                  ✅ Montant correct - Vous pouvez envoyer au laboratoire
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ExamenLabo;
