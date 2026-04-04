import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Table, Tag, Space, message, Modal } from 'antd';
import { UserOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';

const ReceptionPayment = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [amountReceived, setAmountReceived] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Récupérer les paiements en attente
  const fetchPendingPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/v1/reception/pending-payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingPayments(response.data);
    } catch (error) {
      message.error('Erreur lors de la récupération des paiements en attente');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  // Calculer si le bouton "Envoyer au Labo" doit être grisé
  const isSendToLabDisabled = (payment) => {
    if (!amountReceived || !payment) return true;
    const received = parseFloat(amountReceived);
    const total = parseFloat(payment.totalAmount);
    return received < total || received > total;
  };

  // Traiter le paiement
  const handlePayment = async (consultationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/reception/process-payment/${consultationId}`, 
        { amountPaid: parseFloat(amountReceived) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      message.success('Paiement traité avec succès');
      setModalVisible(false);
      setAmountReceived('');
      setSelectedPayment(null);
      fetchPendingPayments();
    } catch (error) {
      message.error('Erreur lors du traitement du paiement');
      console.error('Error:', error);
    }
  };

  // Envoyer au laboratoire
  const handleSendToLab = async (consultationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/v1/reception/send-to-lab/${consultationId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      message.success('Consultation envoyée au laboratoire');
      setModalVisible(false);
      setAmountReceived('');
      setSelectedPayment(null);
      fetchPendingPayments();
    } catch (error) {
      message.error('Erreur lors de l\'envoi au laboratoire');
      console.error('Error:', error);
    }
  };

  // Ouvrir la modale de paiement
  const openPaymentModal = (payment) => {
    setSelectedPayment(payment);
    setAmountReceived(payment.totalAmount);
    setModalVisible(true);
  };

  // Colonnes du tableau
  const columns = [
    {
      title: 'Patient',
      dataIndex: 'patientName',
      key: 'patientName',
      render: (text, record) => (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={record.patientPhoto || '/uploads/default-patient.png'} 
            alt={text}
            style={{ width: 40, height: 40, borderRadius: '50%', marginRight: 8 }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <div style={{ color: '#666', fontSize: '12px' }}>{record.patientCode}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Contact',
      dataIndex: 'patientPhone',
      key: 'patientPhone'
    },
    {
      title: 'Docteur',
      dataIndex: 'doctorName',
      key: 'doctorName'
    },
    {
      title: 'Examens',
      key: 'exams',
      render: (text, record) => (
        <div>
          {record.prescribedExams.map((exam, index) => (
            <Tag key={index} style={{ marginBottom: 4 }}>
              {exam.serviceName}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Montant Total',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (amount) => (
        <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
          {parseFloat(amount).toLocaleString()} F
        </span>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colorMap = {
          'PENDING_PAYMENT': 'orange',
          'PAID_PENDING_LAB': 'blue',
          'PAID_COMPLETED': 'green'
        };
        const textMap = {
          'PENDING_PAYMENT': 'En attente de paiement',
          'PAID_PENDING_LAB': 'Payé - En attente labo',
          'PAID_COMPLETED': 'Terminé'
        };
        return (
          <Tag color={colorMap[status] || 'default'}>
            {textMap[status] || status}
          </Tag>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (text, record) => (
        <Space>
          <Button 
            type="primary" 
            icon={<DollarOutlined />}
            onClick={() => openPaymentModal(record)}
            disabled={record.status === 'PAID_COMPLETED'}
          >
            Traiter Paiement
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card 
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DollarOutlined style={{ marginRight: 8 }} />
            Paiements en Attente
          </div>
        }
        extra={
          <Button 
            icon={<UserOutlined />} 
            onClick={fetchPendingPayments}
            loading={loading}
          >
            Actualiser
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={pendingPayments}
          rowKey="consultationId"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} paiements en attente`
          }}
        />
      </Card>

      {/* Modal de paiement */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <DollarOutlined style={{ marginRight: 8 }} />
            Traitement du Paiement
          </div>
        }
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setSelectedPayment(null);
          setAmountReceived('');
        }}
        footer={null}
        width={600}
      >
        {selectedPayment && (
          <div>
            {/* Informations du patient */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <img 
                  src={selectedPayment.patientPhoto || '/uploads/default-patient.png'} 
                  alt={selectedPayment.patientName}
                  style={{ width: 60, height: 60, borderRadius: '50%', marginRight: 16 }}
                />
                <div>
                  <h4 style={{ margin: 0 }}>{selectedPayment.patientName}</h4>
                  <p style={{ margin: 0, color: '#666' }}>
                    Code: {selectedPayment.patientCode} | 
                    Tel: {selectedPayment.patientPhone}
                  </p>
                </div>
              </div>
            </Card>

            {/* Liste des examens */}
            <Card size="small" title="Examens Prescrits" style={{ marginBottom: 16 }}>
              {selectedPayment.prescribedExams.map((exam, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '8px 0',
                  borderBottom: '1px solid #f0f0f0'
                }}>
                  <span>{exam.serviceName}</span>
                  <span style={{ fontWeight: 'bold' }}>
                    {parseFloat(exam.unitPrice).toLocaleString()} F
                  </span>
                </div>
              ))}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '12px 0',
                borderTop: '2px solid #1890ff',
                marginTop: 8
              }}>
                <strong>Total:</strong>
                <strong style={{ color: '#1890ff', fontSize: '16px' }}>
                  {parseFloat(selectedPayment.totalAmount).toLocaleString()} F
                </strong>
              </div>
            </Card>

            {/* Traitement du paiement */}
            <Card size="small" title="Traitement du Paiement">
              <div style={{ marginBottom: 16 }}>
                <label>Montant Reçu:</label>
                <Input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Entrez le montant reçu"
                  style={{ marginTop: 8 }}
                  addonAfter="F"
                />
              </div>

              {amountReceived && parseFloat(amountReceived) !== parseFloat(selectedPayment.totalAmount) && (
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#fff2e8', 
                  border: '1px solid #ffa940',
                  borderRadius: '4px',
                  marginBottom: 16
                }}>
                  <ClockCircleOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
                  <span style={{ color: '#fa8c16' }}>
                    Montant incorrect. Requis: {parseFloat(selectedPayment.totalAmount).toLocaleString()} F
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => handlePayment(selectedPayment.consultationId)}
                  disabled={isSendToLabDisabled(selectedPayment)}
                  style={{ flex: 1 }}
                >
                  Valider Paiement
                </Button>
                <Button
                  type="primary"
                  ghost
                  icon={<CheckCircleOutlined />}
                  onClick={() => handleSendToLab(selectedPayment.consultationId)}
                  disabled={isSendToLabDisabled(selectedPayment)}
                  style={{ flex: 1 }}
                >
                  Envoyer au Labo
                </Button>
              </div>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReceptionPayment;
