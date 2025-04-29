const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens
const shares = ether

describe('AMM', () => {
  let accounts, 
      deployer,
      liquidityProvider,
      investor1,
      investor2

     
  let token1,
      token2,
      amm

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    deployer = accounts[0]
    liquidityProvider = accounts[1]
    investor1 = accounts[2]
    investor2 = accounts[3]


    const Token = await ethers.getContractFactory('Token')
    token1 = await Token.deploy('Dapp University', 'DAPP', '1000000')
    token2 = await Token.deploy('USD University', 'USD', '1000000')

    let transaction = await token1.connect(deployer).transfer(liquidityProvider.address, tokens(100000))
    await transaction.wait()

    transaction = await token2.connect(deployer).transfer(liquidityProvider.address, tokens(100000))
    await transaction.wait()

    transaction = await token1.connect(deployer).transfer(investor1.address, tokens(100000))
    await transaction.wait()

    transaction = await token2.connect(deployer).transfer(investor2.address, tokens(100000))
    await transaction.wait()


    const AMM = await ethers.getContractFactory('AMM')
    amm = await AMM.deploy(token1.address, token2.address)

   
  })

  describe('Deployment', () => {
    
    it('it has an address', async () => {
      expect(amm.address).to.not.equal(0x0)
    })

    it('trackstoken1 address', async () => {
      expect(await amm.token1()).to.equal(token1.address)
    })

    it('tracks token2 address', async () => {
      expect(await amm.token2()).to.equal(token2.address)
    })
  
  describe('Swapping tokens', () => {
    let amount, transaction, result, estimate, balance
    
    it('facilitates swaps', async () => {

      amount = tokens(100000)
      
      transaction = await token1.connect(deployer).approve(amm.address, amount)
      await transaction.wait()

      transaction = await token2.connect(deployer).approve(amm.address, amount)
      await transaction.wait()


      transaction = await amm.connect(deployer).addLiquidity(amount, amount)
      await transaction.wait()

      expect(await token1.balanceOf(amm.address)).to.equal(amount)
      expect(await token2.balanceOf(amm.address)).to.equal(amount)

      expect(await amm.token1Balance()).to.equal(amount)
      expect(await amm.token2Balance()).to.equal(amount)

      expect(await amm.shares(deployer.address)).to.equal(tokens(100))

      expect(await amm.totalShares()).to.equal(tokens(100))



      amount = tokens(50000)
      
      transaction = await token1.connect(liquidityProvider).approve(amm.address, amount)
      await transaction.wait()

      transaction = await token2.connect(liquidityProvider).approve(amm.address, amount)
      await transaction.wait()

      let token2Deposit = await amm.calculateToken2Deposit(amount)


      transaction = await amm.connect(liquidityProvider).addLiquidity(amount, token2Deposit)
      await transaction.wait()

      expect(await amm.shares(liquidityProvider.address)).to.equal(tokens(50))

      expect(await amm.shares(deployer.address)).to.equal(tokens(100))

      expect(await amm.totalShares()).to.equal(tokens(150))


      console.log(`Price: ${await amm.token2Balance() / await amm.token1Balance()}\n`)

      transaction = await token1.connect(investor1).approve(amm.address, tokens(100000))
      await transaction.wait()

      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance before swap: ${ethers.utils.formatEther(balance)}\n`)

      estimate = await amm.calculateToken1Swap(tokens(1))
      console.log(`Token2 amount investor1 will receive after swap: ${ethers.utils.formatEther(estimate)}\n`)

      transaction = await amm.connect(investor1).swapToken1(tokens(1))
      result = await transaction.wait()

      await expect(transaction).to.emit(amm, 'Swap')
       .withArgs(
        investor1.address,
        token1.address,
        tokens(1),
        token2.address,
        estimate,
        await amm.token1Balance(),
        await amm.token2Balance(),
        (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
      )

      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance after swap: ${ethers.utils.formatEther(balance)}\n`)
      expect(estimate).to.equal(balance)

      expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

      console.log(`Price: ${await amm.token2Balance() / await amm.token1Balance()}\n`)


      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance before swap: ${ethers.utils.formatEther(balance)}`)

      estimate = await amm.calculateToken1Swap(tokens(1))
      console.log(`Token2 Amount investor1 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

      transaction = await amm.connect(investor1).swapToken1(tokens(1))
      await transaction.wait()

      balance = await token2.balanceOf(investor1.address)
      console.log(`Investor1 Token2 balance after swap: ${ethers.utils.formatEther(balance)} \n`)

      expect(await token1.balanceOf(amm.address)).to.equal(await amm.token1Balance())
      expect(await token2.balanceOf(amm.address)).to.equal(await amm.token2Balance())

      console.log(`Price: ${await amm.token2Balance() / await amm.token1Balance()}\n`)

      





      transaction = await token2.connect(investor2).approve(amm.address, tokens(100000))
      await transaction.wait()

      balance = await token1.balanceOf(investor2.address)
      console.log(`Investor2 Token1 balance before swap: ${ethers.utils.formatEther(balance)}`)

      estimate = await amm.calculateToken2Swap(tokens(1))
      console.log(`Token1 Amount investor2 will receive after swap: ${ethers.utils.formatEther(estimate)}`)

      transaction = await amm.connect(investor2).swapToken2(tokens(1))
      await transaction.wait()

      await expect(transaction).to.emit(amm, 'Swap')
        .withArgs(
          investor2.address,
          token2.address,
          tokens(1),
          token1.address,
          estimate,
          await amm.token1Balance(),
          await amm.token2Balance(),
          (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
        )

      balance = await token1.balanceOf(investor2.address)
      console.log(`Investor2 Token1 balance after swap: ${ethers.utils.formatEther(balance)} \n`)
      expect(estimate).to.equal(balance)


      console.log(`AMM Token1 Balance: ${ethers.utils.formatEther(await amm.token1Balance())} \n`)
      console.log(`AMM Token2 Balance: ${ethers.utils.formatEther(await amm.token2Balance())} \n`)


      balance = await token1.balanceOf(liquidityProvider.address)
      console.log(`Liquidity Provider Token1 balance before removing funds: ${ethers.utils.formatEther(balance)} \n`)

      balance = await token2.balanceOf(liquidityProvider.address)
      console.log(`Liquidity Provider Token2 balance before removing funds: ${ethers.utils.formatEther(balance)} \n`)


      transaction = await amm.connect(liquidityProvider).removeLiquidity(shares(50)) // 50 Shares
      await transaction.wait()


      balance = await token1.balanceOf(liquidityProvider.address)
      console.log(`Liquidity Provider Token1 balance after removing fund: ${ethers.utils.formatEther(balance)} \n`)

      balance = await token2.balanceOf(liquidityProvider.address)
      console.log(`Liquidity Provider Token2 balance after removing fund: ${ethers.utils.formatEther(balance)} \n`)

      expect(await amm.shares(liquidityProvider.address)).to.equal(0)

      expect(await amm.shares(deployer.address)).to.equal(shares(100))

      expect(await amm.totalShares()).to.equal(shares(100))






    })

    //it('returns token1 address', async () => {
      //expect(await amm.token1()).to.equal(token1.address)
    //})

    //it('returns token2 address', async () => {
    //  expect(await amm.token2()).to.equal(token2.address)
    //})

 })
})

})
