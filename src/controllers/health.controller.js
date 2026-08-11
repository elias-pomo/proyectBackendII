export const checkHealth = (req, res) =>{
    
    //Respuesta indicando que el servidor está activo
    res.status(200).json({status: 'success', message: 'OK'});
}
